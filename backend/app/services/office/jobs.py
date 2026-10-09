"""Bounded per-worker/per-user concurrency, deadlines, disconnect cleanup and no persistence."""
import asyncio
from contextlib import suppress
import json
import os
from pathlib import Path
import sys
import tempfile

from fastapi import HTTPException, Request
from pydantic import ValidationError

from app.schemas.office import OfficeRequest
from app.schemas.office_limits import OfficeLimits
from app.core.config import settings

BACKEND = Path(__file__).resolve().parents[3]
ACTIVE_USERS: set[int] = set()


def export_limits() -> OfficeLimits:
    return OfficeLimits(max_assets=getattr(settings, 'office_max_assets', 64),
                        max_total_bytes=getattr(settings, 'office_max_total_mb', 48) * 1_000_000,
                        max_total_pixels=getattr(settings, 'office_max_total_pixels', 128_000_000))


def resolve_font() -> Path:
    configured = os.environ.get('TRUSTED_KNOWLEDGE_OFFICE_FONT_PATH', getattr(settings, 'office_font_path', '')).strip()
    candidates = [Path(configured)] if configured else [
        Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'),
        Path('/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc'),
    ]
    for file in candidates:
        if file.is_file(): return file.resolve()
    raise HTTPException(503, '导出字体未安装：请安装 Noto Sans CJK，或设置 TRUSTED_KNOWLEDGE_OFFICE_FONT_PATH 后重启后端。')


async def read_payload(request: Request, limits: OfficeLimits) -> OfficeRequest:
    data = bytearray()
    async for chunk in request.stream():
        if len(data) + len(chunk) > limits.max_body_bytes:
            raise HTTPException(413, f'导出请求超过 {limits.max_body_bytes / 1_000_000:g} MB，请压缩图片或拆分正文。')
        data.extend(chunk)
    try: return OfficeRequest.model_validate_json(bytes(data), context={'office_limits': limits})
    except ValidationError as exc:
        # Never reflect entire validation inputs (which may contain private text/base64).
        messages = [error['msg'] for error in exc.errors(include_input=False, include_url=False)[:3]]
        raise HTTPException(422, '导出内容不符合要求：' + '；'.join(messages)) from None


async def wait_disconnect(request, stopping: asyncio.Event):
    while not stopping.is_set():
        if await request.is_disconnected(): return
        try: await asyncio.wait_for(stopping.wait(), timeout=.2)
        except asyncio.TimeoutError: pass


async def execute(request: Request, user_id: int, kind: str) -> tuple[bytes, str]:
    if user_id in ACTIVE_USERS or len(ACTIVE_USERS) >= 2:
        raise HTTPException(429, '已有导出任务进行中，请稍后重试。')
    ACTIVE_USERS.add(user_id)
    try:
        limits = export_limits()
        try: payload = await asyncio.wait_for(read_payload(request, limits), timeout=30)
        except asyncio.TimeoutError: raise HTTPException(408, '读取导出内容超时，请重试。') from None
        font = resolve_font() if kind != 'docx' else Path('.')
        with tempfile.TemporaryDirectory(prefix='trusted-knowledge-office-') as name:
            directory = Path(name)
            (directory / 'request.json').write_text(payload.model_dump_json(exclude_none=True))
            # Not a request field: clients cannot override resource policy.
            (directory / 'limits.json').write_text(limits.model_dump_json())
            env = {key: value for key, value in os.environ.items() if key in ('PATH', 'PYTHONPATH', 'PYTHONHOME', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'SYSTEMROOT')}
            try:
                process = await asyncio.create_subprocess_exec(
                    sys.executable, '-m', 'app.services.office.worker', str(directory), kind, str(font),
                    cwd=BACKEND, env=env, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
                )
            except OSError:
                raise HTTPException(503, '无法启动导出进程，请检查后端 Python 环境和进程权限。') from None
            completion = asyncio.create_task(process.wait())
            stopping = asyncio.Event()
            disconnected = asyncio.create_task(wait_disconnect(request, stopping))
            try:
                done, _ = await asyncio.wait((completion, disconnected), timeout=90, return_when=asyncio.FIRST_COMPLETED)
                if disconnected in done: raise HTTPException(499, '导出已取消。')
                if completion not in done: raise HTTPException(504, '导出超时，请拆分文档后重试。')
                if process.returncode != 0:
                    error_file = directory / 'error.json'
                    if error_file.exists(): raise HTTPException(422, json.loads(error_file.read_text())['detail'])
                    raise HTTPException(503, '导出进程不可用，请安装后端依赖并重启后端；或缩小内容后重试。')
                file = directory / ('result.json' if kind == 'preview' else f'aibs-markdown-proof.{kind}')
                if not file.exists() or file.stat().st_size > limits.max_output_bytes: raise HTTPException(422, '导出结果缺失或过大。')
                title = next((''.join(run.text or '' for run in block.runs) for block in payload.source.blocks if block.type == 'heading'), 'Markdown 文档')
                return file.read_bytes(), title
            finally:
                if process.returncode is None:
                    with suppress(ProcessLookupError): process.kill()
                    await process.wait()
                # Request.is_disconnected uses an AnyIO cancel scope. An explicit
                # stop signal avoids task cancellation being swallowed by that scope.
                completion.cancel(); stopping.set()
                await asyncio.gather(completion, disconnected, return_exceptions=True)
    finally:
        ACTIVE_USERS.discard(user_id)
