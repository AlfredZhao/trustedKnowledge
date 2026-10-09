import asyncio
import base64
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch
from zipfile import ZipFile

import fastapi
from fastapi import FastAPI, HTTPException
import httpx
from PIL import Image
from pydantic import ValidationError

from tests.support import prepare_backend_imports
prepare_backend_imports()
from app.api.office import router
from app.core.security import require_current_user
from app.schemas.office import OfficeRequest
from app.schemas.office_limits import OfficeLimits
from app.services.office import jobs
from app.services.office import engine
from app.services.office.worker import generate, unpack_source


def payload():
    return {'template': 'aibs-v1', 'source': {'blocks': [
        {'id': 'title', 'type': 'heading', 'level': 1, 'runs': [{'text': '接口测试'}]},
        {'id': 'body', 'type': 'paragraph', 'runs': [{'text': '原文保留 ENGLISH', 'bold': True}]},
    ], 'assets': []}, 'metadata': {'subtitle': '', 'version': '', 'footer': ''}}


def image_payload(width=20, height=10):
    value = payload()
    image = Image.new('RGB', (width, height), 'white'); buffer = io.BytesIO(); image.save(buffer, 'PNG')
    value['source']['assets'] = [{'id': 'asset1', 'kind': 'image', 'alt': 'fixture', 'width': width, 'height': height, 'data': base64.b64encode(buffer.getvalue()).decode()}]
    value['source']['blocks'].append({'id': 'picture', 'type': 'graphic', 'asset': 'asset1'})
    return value


class CopyrightChecks(unittest.TestCase):
    def test_shanghai_year_and_new_year_boundary(self):
        for instant, year in [
            ('2026-10-09T00:00:00+00:00', 2026),
            ('2026-12-31T15:59:59+00:00', 2026),
            ('2026-12-31T16:00:00+00:00', 2027),
            ('2027-10-09T00:00:00+00:00', 2027),
        ]:
            with self.subTest(instant=instant):
                profile = engine.load_template_profile(datetime.fromisoformat(instant))
                for kind in ('pptx', 'docx'):
                    self.assertEqual(profile[kind]['copyright'], f'Copyright © {year}, Oracle and/or its affiliates')

    def test_profiles_are_fresh_per_job_and_do_not_modify_templates(self):
        original = (engine.HERE / 'template-profile.json').read_bytes()
        profile = engine.load_template_profile(datetime(2026, 1, 1, tzinfo=timezone.utc))
        hashes = {kind: hashlib.sha256((engine.ROOT / profile[kind]['path']).read_bytes()).hexdigest() for kind in ('pptx', 'docx')}
        profile['pptx']['copyright'] = 'changed only in memory'
        self.assertIn('2027', engine.load_template_profile(datetime(2027, 1, 1, tzinfo=timezone.utc))['pptx']['copyright'])
        self.assertEqual((engine.HERE / 'template-profile.json').read_bytes(), original)
        for kind in hashes:
            self.assertEqual(hashlib.sha256((engine.ROOT / profile[kind]['path']).read_bytes()).hexdigest(), hashes[kind])

    def test_naive_datetime_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'timezone-aware'):
            engine.load_template_profile(datetime(2026, 1, 1))

    def test_worker_preview_and_office_copyright_with_frozen_time(self):
        value = payload()
        value['source']['blocks'][1]['runs'] = [{'text': '历史记录 2025、2026 不应替换'}]
        font = jobs.resolve_font()
        for year in (2026, 2027):
            for kind in ('preview', 'pptx', 'docx'):
                with self.subTest(year=year, kind=kind), tempfile.TemporaryDirectory() as tmp, patch.object(engine, 'datetime') as clock:
                    clock.now.return_value = datetime(year, 10, 9, tzinfo=timezone.utc)
                    directory = Path(tmp)
                    generate(OfficeRequest.model_validate(value), directory, kind, font)
                    clock.now.assert_called_once()
                    copyright_text = f'Copyright © {year}, Oracle and/or its affiliates'
                    if kind == 'preview':
                        result = json.loads((directory / 'result.json').read_text())
                        self.assertEqual(result['copyright'], copyright_text)
                        self.assertIn('历史记录 2025、2026 不应替换', json.dumps(result, ensure_ascii=False))
                        continue
                    with ZipFile(directory / f'aibs-markdown-proof.{kind}') as archive:
                        parts = [name for name in archive.namelist() if (
                            name.startswith('ppt/slides/slide') or name.startswith('word/footer') or name == 'word/document.xml'
                        ) and name.endswith('.xml')]
                        self.assertGreaterEqual(len(parts), 2)
                        for name in parts:
                            text = archive.read(name).decode()
                            self.assertIn(copyright_text, text, name)
                            self.assertNotIn('{year}', text)
                        body = archive.read('ppt/slides/slide2.xml' if kind == 'pptx' else 'word/document.xml').decode()
                        self.assertIn('历史记录 2025、2026 不应替换', body)

    def test_offline_cli_uses_same_year_for_html_and_office(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(engine, 'datetime') as clock:
            clock.now.return_value = datetime(2026, 12, 31, 16, tzinfo=timezone.utc)
            directory = Path(tmp)
            (directory / 'assets').mkdir()
            (directory / 'source.md').write_bytes(b'fixture')
            source = payload()['source']
            source.update(schema=1, source_sha256=hashlib.sha256(b'fixture').hexdigest(), warnings=[])
            (directory / 'source.json').write_text(json.dumps(source))
            with patch('sys.argv', ['generate.py', tmp, '--measure-font', str(jobs.resolve_font())]), patch('builtins.print'):
                engine.main()
            clock.now.assert_called_once()
            plan = json.loads((directory / 'layout-plan.json').read_text())
            for kind in ('pptx', 'docx'):
                self.assertIn('2027', plan['profile'][kind]['copyright'])
                with ZipFile(directory / f'aibs-markdown-proof.{kind}') as archive:
                    part = 'ppt/slides/slide1.xml' if kind == 'pptx' else 'word/document.xml'
                    self.assertIn('Copyright © 2027', archive.read(part).decode())
            self.assertIn('Copyright © 2027', (directory / 'ppt-layout-preview.html').read_text())


class SchemaChecks(unittest.TestCase):
    def test_configurable_asset_count_and_encoded_boundaries(self):
        value = image_payload()
        seed = value['source']['assets'][0]
        def resize(count, data):
            value['source']['assets'] = [{**seed, 'id': f'a{i}', 'data': data} for i in range(count)]
            value['source']['blocks'] = payload()['source']['blocks'] + [{'id': f'b{i}', 'type': 'graphic', 'asset': f'a{i}'} for i in range(count)]
        resize(64, seed['data'])
        OfficeRequest.model_validate(value)
        resize(65, seed['data'])
        with self.assertRaisesRegex(ValidationError, '65.*64'): OfficeRequest.model_validate(value)
        OfficeRequest.model_validate(value, context={'office_limits': OfficeLimits(max_assets=80)})
        resize(12, 'A' * 4_000_000)
        OfficeRequest.model_validate(value)
        value['source']['assets'].append({**seed, 'id': 'extra', 'data': 'AAAA'})
        value['source']['blocks'].append({'id': 'extra', 'type': 'graphic', 'asset': 'extra'})
        with self.assertRaisesRegex(ValidationError, '48,000,004.*48 MB'): OfficeRequest.model_validate(value)
        resize(4, 'A' * 4_000_000)
        with self.assertRaisesRegex(ValidationError, '12 MB'):
            OfficeRequest.model_validate(value, context={'office_limits': OfficeLimits(max_total_bytes=12_000_000)})

    def test_policy_is_bounded_and_not_a_client_request_field(self):
        for values in ({'max_assets': 129}, {'max_assets': 0}, {'max_total_bytes': 100_000_000}, {'max_total_pixels': 300_000_000}):
            with self.assertRaises(ValidationError): OfficeLimits(**values)
        value = payload(); value['limits'] = {'max_assets': 99999}
        with self.assertRaises(ValidationError): OfficeRequest.model_validate(value)

    def test_worker_enforces_configured_decoded_pixel_budget(self):
        value = image_payload(3000, 3000)
        value['source']['assets'].append({**value['source']['assets'][0], 'id': 'asset2'})
        value['source']['blocks'].append({'id': 'picture2', 'type': 'graphic', 'asset': 'asset2'})
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError, '18,000,000.*16,000,000'):
                unpack_source(OfficeRequest.model_validate(value), Path(tmp), OfficeLimits(max_total_pixels=16_000_000))

    def test_rejects_unknown_template_and_paths(self):
        for mutate in [lambda p: p.update(template='../secret'), lambda p: p['source'].update(path='/etc/passwd')]:
            value = payload(); mutate(value)
            with self.assertRaises(ValidationError): OfficeRequest.model_validate(value)

    def test_missing_duplicate_or_unused_asset_rejected(self):
        for index in range(3):
            value = image_payload()
            if index == 0: value['source']['assets'] = []
            elif index == 1: value['source']['assets'] *= 2
            else: value['source']['blocks'].pop()
            with self.assertRaises(ValidationError): OfficeRequest.model_validate(value)

    def test_control_characters_and_unsafe_links_rejected(self):
        for run in [{'text': '\x00'}, {'text': 'x', 'href': 'file:///etc/passwd'}, {'text': 'x', 'href': 'javascript:alert(1)'}]:
            value = payload(); value['source']['blocks'][1]['runs'] = [run]
            with self.assertRaises(ValidationError): OfficeRequest.model_validate(value)

    def test_total_text_limit(self):
        value = payload(); value['source']['blocks'][1]['runs'] = [{'text': 'a' * 70_000}, {'text': 'b' * 70_000}]
        with self.assertRaises(ValidationError): OfficeRequest.model_validate(value)

    def test_metadata_never_accepts_overflowing_or_multiline_footer(self):
        for footer in ['a' * 25, 'a\nb']:
            value = payload(); value['metadata']['footer'] = footer
            with self.assertRaises(ValidationError): OfficeRequest.model_validate(value)

    def test_non_png_asset_cannot_reach_office_writer(self):
        value = image_payload(); value['source']['assets'][0]['data'] = base64.b64encode(b'<svg><script/></svg>').decode()
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(Exception): unpack_source(OfficeRequest.model_validate(value), Path(tmp))

    def test_false_image_aspect_rejected(self):
        value = image_payload(); value['source']['assets'][0]['height'] = 100
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError, '比例'): unpack_source(OfficeRequest.model_validate(value), Path(tmp))

    def test_valid_image_is_copied_under_generated_asset_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = unpack_source(OfficeRequest.model_validate(image_payload()), Path(tmp))
            self.assertNotIn('data', source['assets'][0])
            self.assertTrue((Path(tmp) / 'assets/asset1.png').is_file())


class ApiChecks(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.app = FastAPI(); self.app.include_router(router, prefix='/api')
        async def current_user(): return SimpleNamespace(user_id=999)
        self.app.dependency_overrides[require_current_user] = current_user
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url='http://test')
        jobs.ACTIVE_USERS.clear()

    async def asyncTearDown(self):
        await self.client.aclose(); self.assertFalse(jobs.ACTIVE_USERS)

    async def test_authentication_required(self):
        self.app.dependency_overrides.clear()
        response = await self.client.post('/api/markdown/office/preview', json=payload())
        self.assertEqual(response.status_code, 401)
        self.assertEqual((await self.client.get('/api/markdown/office/limits')).status_code, 401)

    async def test_policy_endpoint_and_enforcement_share_admin_settings(self):
        with patch.object(jobs.settings, 'office_max_assets', 1, create=True), patch.object(jobs.settings, 'office_max_total_mb', 12, create=True):
            response = await self.client.get('/api/markdown/office/limits')
            self.assertEqual(response.status_code, 200)
            self.assertIn('no-store', response.headers['cache-control'])
            self.assertEqual(response.json()['max_assets'], 1)
            self.assertEqual(response.json()['max_total_bytes'], 12_000_000)
            self.assertEqual(response.json()['max_body_bytes'], 20_000_000)
            value = image_payload()
            value['source']['assets'].append({**value['source']['assets'][0], 'id': 'a2'})
            value['source']['blocks'].append({'id': 'b2', 'type': 'graphic', 'asset': 'a2'})
            with patch.object(jobs.asyncio, 'create_subprocess_exec', new=AsyncMock()) as process:
                response = await self.client.post('/api/markdown/office/preview', json=value)
                self.assertEqual(response.status_code, 422); process.assert_not_awaited()
                self.assertIn('上限 1 个', response.text)

    async def test_long_mixed_title_exports_without_truncation(self):
        title = '揭开 Oracle 属性图的神秘面纱：给 DBA 的 GRAPH_TABLE 内部机制指南'
        value = payload(); value['source']['blocks'][0]['runs'] = [{'text': title, 'bold': True}]
        value['metadata'] = {'subtitle': '副标题不重叠', 'version': '版本说明', 'footer': ''}
        response = await self.client.post('/api/markdown/office/preview', json=value)
        self.assertEqual(response.status_code, 200, response.text)
        heading, subtitle, version = response.json()['pages'][0]['elements']
        lines = [''.join(run['text'] for run in line) for line in heading['line_runs']]
        self.assertEqual(''.join(lines), title)
        self.assertEqual(len(lines), 3)
        self.assertTrue(lines[0].endswith('：'))
        self.assertTrue(any('GRAPH_TABLE' in line for line in lines))
        self.assertLess(heading['y'] + heading['h'], subtitle['y'])
        self.assertLess(subtitle['y'] + subtitle['h'], version['y'])
        self.assertLess(version['y'] + version['h'], 507)
        for kind in ('pptx', 'docx'):
            result = await self.client.post('/api/markdown/office/export/' + kind, json=value)
            self.assertEqual(result.status_code, 200)
            if kind == 'pptx':
                presentation = engine.Presentation(io.BytesIO(result.content))
                shape = next(s for s in presentation.slides[0].shapes if s.name.startswith('tk:title:'))
                self.assertEqual(shape.text.replace('\v', '').replace('\n', ''), title)
                self.assertFalse(shape.text_frame.word_wrap)
            else:
                document = engine.Document(io.BytesIO(result.content))
                self.assertIn(title, [p.text for p in document.paragraphs])

    async def test_admin_policy_snapshot_reaches_actual_worker(self):
        value = image_payload()
        seed = value['source']['assets'][0]
        value['source']['assets'] = [{**seed, 'id': f'a{i}'} for i in range(65)]
        value['source']['blocks'] = payload()['source']['blocks'] + [{'id': f'b{i}', 'type': 'graphic', 'asset': f'a{i}'} for i in range(65)]
        with patch.object(jobs.settings, 'office_max_assets', 80, create=True):
            result = await self.client.post('/api/markdown/office/preview', json=value)
            self.assertEqual(result.status_code, 200, result.text[:300])
        value = image_payload(3000, 3000)
        value['source']['assets'].append({**value['source']['assets'][0], 'id': 'a2'})
        value['source']['blocks'].append({'id': 'b2', 'type': 'graphic', 'asset': 'a2'})
        with patch.object(jobs.settings, 'office_max_total_pixels', 16_000_000, create=True):
            result = await self.client.post('/api/markdown/office/preview', json=value)
            self.assertEqual(result.status_code, 422)
            self.assertIn('18,000,000', result.text)
            self.assertIn('16,000,000', result.text)

    async def test_actual_preview_uses_fixed_canvas_and_blank_optional_metadata(self):
        response = await self.client.post('/api/markdown/office/preview', json=payload())
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn('no-store', response.headers['cache-control'])
        data = response.json()
        self.assertEqual(len(data['pages']), 2)
        self.assertEqual(data['footer'], '')
        self.assertNotIn('技术验证样稿', response.text)
        self.assertIn('warnings', data)

    async def test_actual_pptx_and_docx_are_native_valid_packages(self):
        for kind, part in [('pptx', 'ppt/slides/slide2.xml'), ('docx', 'word/document.xml')]:
            response = await self.client.post('/api/markdown/office/export/' + kind, json=payload())
            self.assertEqual(response.status_code, 200, response.text if response.status_code != 200 else '')
            self.assertIn('attachment', response.headers['content-disposition'])
            self.assertIn('no-store', response.headers['cache-control'])
            with ZipFile(io.BytesIO(response.content)) as archive:
                self.assertIsNone(archive.testzip())
                text = archive.read(part).decode()
                self.assertIn('原文保留 ENGLISH', text)
                self.assertNotIn('技术验证样稿', text)

    async def test_oversize_stream_rejected_before_worker(self):
        with patch.object(OfficeLimits, 'max_body_bytes', property(lambda _: 50)), patch.object(jobs.asyncio, 'create_subprocess_exec', new=AsyncMock()) as process:
            response = await self.client.post('/api/markdown/office/preview', json=payload())
            self.assertEqual(response.status_code, 413); process.assert_not_awaited()

    async def test_validation_errors_do_not_echo_private_input(self):
        value = payload(); value['source']['blocks'][1]['runs'][0]['href'] = 'file:///TOP-SECRET'
        response = await self.client.post('/api/markdown/office/preview', json=value)
        self.assertEqual(response.status_code, 422)
        self.assertNotIn('TOP-SECRET', response.text)

    async def test_per_user_and_global_concurrency_rejected(self):
        for users in [{999}, {1, 2}]:
            jobs.ACTIVE_USERS.update(users)
            response = await self.client.post('/api/markdown/office/preview', json=payload())
            self.assertEqual(response.status_code, 429)
            jobs.ACTIVE_USERS.clear()

    async def test_missing_font_explains_manual_configuration(self):
        with patch.object(jobs, 'resolve_font', side_effect=HTTPException(503, '字体未安装')):
            response = await self.client.post('/api/markdown/office/preview', json=payload())
            self.assertEqual(response.status_code, 503)

    async def test_spawn_failure_releases_slot_and_reports_environment_problem(self):
        with patch.object(jobs.asyncio, 'create_subprocess_exec', new=AsyncMock(side_effect=OSError('denied'))):
            response = await self.client.post('/api/markdown/office/preview', json=payload())
            self.assertEqual(response.status_code, 503)
            self.assertIn('进程', response.text)

    async def test_worker_timeout_kills_process_and_releases_slot(self):
        class FakeProcess:
            returncode = None
            event = asyncio.Event()
            async def wait(self): await self.event.wait(); return self.returncode
            def kill(self): self.returncode = -9; self.event.set()
        class FakeRequest:
            async def stream(self): yield json.dumps(payload()).encode()
            async def is_disconnected(self): return False
        process = FakeProcess()
        with patch.object(jobs.asyncio, 'create_subprocess_exec', new=AsyncMock(return_value=process)), patch.object(jobs.asyncio, 'wait', new=AsyncMock(return_value=(set(), set()))):
            with self.assertRaises(HTTPException) as caught: await jobs.execute(FakeRequest(), 77, 'preview')
            self.assertEqual(caught.exception.status_code, 504)
            self.assertEqual(process.returncode, -9)

    async def test_docx_does_not_depend_on_ppt_title_fit(self):
        value = payload(); value['source']['blocks'][0]['runs'][0]['text'] = '长标题' * 50
        with patch.object(jobs, 'resolve_font', side_effect=AssertionError('DOCX must not need PPT metrics')):
            response = await self.client.post('/api/markdown/office/export/docx', json=value)
            self.assertEqual(response.status_code, 200)

    async def test_titleless_source_gets_cover_without_removing_original_text(self):
        value = payload(); value['source']['blocks'].pop(0)
        response = await self.client.post('/api/markdown/office/preview', json=value)
        self.assertEqual(response.status_code, 200)
        pages = response.json()['pages']
        self.assertEqual(pages[0]['layout'], 'cover')
        self.assertIn('原文保留 ENGLISH', response.text)

    async def test_disconnect_kills_worker_and_removes_private_scratch(self):
        class FakeProcess:
            returncode = None
            event = asyncio.Event()
            async def wait(self): await self.event.wait(); return self.returncode
            def kill(self): self.returncode = -9; self.event.set()
        class FakeRequest:
            async def stream(self): yield json.dumps(payload()).encode()
            async def is_disconnected(self): return True
        process = FakeProcess()
        with patch.object(jobs.asyncio, 'create_subprocess_exec', new=AsyncMock(return_value=process)) as spawn:
            with self.assertRaises(HTTPException) as caught:
                await jobs.execute(FakeRequest(), 77, 'preview')
            self.assertEqual(caught.exception.status_code, 499)
            self.assertEqual(process.returncode, -9)
            scratch = Path(spawn.call_args.args[3])
            self.assertFalse(scratch.exists())
            self.assertNotIn('TRUSTED_KNOWLEDGE_DB_PASSWORD', spawn.call_args.kwargs['env'])


if __name__ == '__main__': unittest.main(verbosity=2)
