"""Short-lived export worker. No DB, auth credentials, browser, or network fetches."""
import base64
import io
import json
from pathlib import Path
import sys
import warnings
from zipfile import ZipFile

from PIL import Image

from app.schemas.office import OfficeRequest
from app.schemas.office_limits import OfficeLimits
from .engine import ROOT, Metrics, Planner, Presentation, MSO_SHAPE_TYPE, load_template_profile, write_docx, write_pptx


def unpack_source(payload, directory, limits=None):
    limits = limits or OfficeLimits()
    source = payload.source.model_dump(exclude_none=True)
    (directory / 'assets').mkdir()
    pixels = 0
    for asset in source['assets']:
        raw = base64.b64decode(asset.pop('data'), validate=True)
        if len(raw) > 3_000_000: raise ValueError('单张图片超过 3 MB，请压缩图片')
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as image:
                if image.format != 'PNG': raise ValueError('只接受已渲染的 PNG 图片')
                width, height = image.size
                pixels += width * height
                if width > 8192 or height > 8192 or width * height > 16_000_000:
                    raise ValueError('图片分辨率过高，请缩小图片后重试')
                if pixels > limits.max_total_pixels:
                    raise ValueError(f'素材总像素 {pixels:,} 超过上限 {limits.max_total_pixels:,}，请缩小图片或拆分文档')
                if abs((asset['width'] / asset['height']) / (width / height) - 1) > .02:
                    raise ValueError('图片尺寸与声明比例不一致')
                image.verify()
            # Re-encode only pixels, removing metadata/trailing data from client uploads.
            with Image.open(io.BytesIO(raw)) as image:
                file = directory / 'assets' / f'{asset["id"]}.png'
                image.convert('RGBA').save(file, 'PNG')
        asset['file'] = f'assets/{asset["id"]}.png'
    return source


def decorations(profile):
    template = Presentation(ROOT / profile['pptx']['path'])
    layouts = {layout.name: layout for layout in template.slide_layouts}
    result = {}
    for key, name in profile['pptx']['layouts'].items():
        layout = layouts[name]
        owners = [layout.slide_master, layout] if layout._element.get('showMasterSp') != '0' else [layout]
        pictures = []
        for owner in owners:
            for shape in owner.shapes:
                if shape.shape_type != MSO_SHAPE_TYPE.PICTURE: continue
                picture = {'x': shape.left / 12700, 'y': shape.top / 12700, 'w': shape.width / 12700, 'h': shape.height / 12700}
                if shape.image.ext in ('png', 'jpg', 'jpeg'):
                    picture['src'] = f'data:{shape.image.content_type};base64,' + base64.b64encode(shape.image.blob).decode()
                else: picture['unsupported'] = shape.image.ext
                pictures.append(picture)
        result[key] = pictures
    return result


def generate(payload: OfficeRequest, directory: Path, kind: str, font_file: Path, limits=None):
    limits = limits or OfficeLimits()
    profile = load_template_profile()
    source = unpack_source(payload, directory, limits)
    first = source['blocks'][0]
    if first['type'] != 'heading' or first.get('level') != 1:
        title = next((''.join(run.get('text', '') for run in block['runs']) for block in source['blocks'] if block['type'] == 'heading'), 'Markdown 文档')
        ids = {block['id'] for block in source['blocks']}
        cover_id = '_office_cover'
        while cover_id in ids: cover_id += '_'
        source['blocks'].insert(0, {'id': cover_id, 'type': 'heading', 'level': 1, 'runs': [{'text': title}], 'sourceStart': 0, 'sourceEnd': 0})
    profile['sample_metadata'] = payload.metadata.model_dump()
    profile['document_subject'] = 'Markdown template export'
    pages = []
    if kind in ('preview', 'pptx'):
        pages = Planner(source, profile, Metrics(font_file)).build()
    if kind == 'preview':
        result = {
            'pages': pages, 'decorations': decorations(profile), 'fonts': profile['fonts'], 'colors': profile['colors'],
            'copyright': profile['pptx']['copyright'], 'footer': payload.metadata.footer,
            'warnings': [
                '网页是固定 16:9 近似预览，不是 Microsoft Office 原生渲染；请在交付前检查字体与分页。',
                '图片、Mermaid 和公式为嵌入图形；文字和表格可编辑，Mermaid 源码保留在 PPT 备注中。',
                '部分 WMF 品牌装饰仅在 Office 中显示；字体未嵌入，Word 自动目录与自动列表编号尚未适配。',
            ],
        }
        (directory / 'result.json').write_text(json.dumps(result, ensure_ascii=False))
        return
    if kind == 'pptx': write_pptx(source, profile, pages, directory)
    elif kind == 'docx': write_docx(source, profile, directory)
    else: raise ValueError('不支持的导出格式')
    file = directory / f'aibs-markdown-proof.{kind}'
    if file.stat().st_size > limits.max_output_bytes: raise ValueError('导出文件过大，请拆分文档')
    with ZipFile(file) as archive:
        if archive.testzip() is not None: raise ValueError('导出文件结构校验失败')


def main():
    directory, kind, font_file = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
    try:
        if sys.platform.startswith('linux'):
            import resource
            resource.setrlimit(resource.RLIMIT_CPU, (75, 76))
            resource.setrlimit(resource.RLIMIT_AS, (1536 * 1024**2, 1536 * 1024**2))
        policy_file = directory / 'limits.json'
        limits = OfficeLimits.model_validate_json(policy_file.read_bytes()) if policy_file.exists() else OfficeLimits()
        payload = OfficeRequest.model_validate_json((directory / 'request.json').read_bytes(), context={'office_limits': limits})
        generate(payload, directory, kind, font_file, limits)
    except (ValueError, KeyError) as exc:
        (directory / 'error.json').write_text(json.dumps({'detail': str(exc)[:240]}, ensure_ascii=False))
        raise SystemExit(2)
    except Exception:
        # No traceback/source text/paths in server logs or API responses.
        (directory / 'error.json').write_text(json.dumps({'detail': '模板生成失败，请检查部署依赖、模板及图片格式。'}))
        raise SystemExit(3)


if __name__ == '__main__': main()
