"""Strict, bounded document IR. No user-controlled paths, URLs to fetch, or templates."""
from typing import Literal, Self
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, model_validator
from .office_limits import OfficeLimits

ID_PATTERN = r'^[a-zA-Z0-9_-]{1,64}$'


class OfficeModel(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)


class OfficeRun(OfficeModel):
    text: str | None = Field(None, max_length=120_000)
    asset: str | None = Field(None, pattern=ID_PATTERN)
    alt: str = Field('', max_length=20_000)
    bold: bool = False
    italic: bool = False
    code: bool = False
    href: str | None = Field(None, max_length=2048)

    @model_validator(mode='after')
    def valid_run(self) -> Self:
        if (self.text is None) == (self.asset is None):
            raise ValueError('文字与图片引用必须且只能提供一个')
        if self.href:
            url = urlsplit(self.href)
            if url.scheme.lower() not in ('https', 'http', 'mailto') or (url.scheme in ('http', 'https') and not url.netloc):
                raise ValueError('导出链接只支持 http、https 和 mailto')
        return self


class OfficeAsset(OfficeModel):
    id: str = Field(pattern=ID_PATTERN)
    kind: Literal['image', 'formula', 'mermaid']
    alt: str = Field('', max_length=20_000)
    width: float = Field(gt=0, le=8192)
    height: float = Field(gt=0, le=8192)
    data: str = Field(min_length=1, max_length=4_000_000, pattern=r'^[A-Za-z0-9+/]*={0,2}$')


class OfficeBlock(OfficeModel):
    id: str = Field(pattern=ID_PATTERN)
    type: Literal['heading', 'paragraph', 'code', 'graphic', 'table', 'break', 'rule']
    sourceStart: int = Field(0, ge=0, le=200_000)
    sourceEnd: int = Field(0, ge=0, le=200_000)
    runs: list[OfficeRun] = Field(default_factory=list, max_length=1000)
    level: int = Field(1, ge=1, le=4)
    text: str = Field('', max_length=120_000)
    language: str = Field('', max_length=40)
    asset: str | None = Field(None, pattern=ID_PATTERN)
    alt: str = Field('', max_length=20_000)
    rows: list[list[list[OfficeRun]]] = Field(default_factory=list, max_length=201)
    list: Literal['ul', 'ol'] | None = None
    prefix: str = Field('', max_length=20)
    quote: bool = False

    @model_validator(mode='after')
    def valid_block(self) -> Self:
        if self.type in ('heading', 'paragraph') and not self.runs:
            raise ValueError('段落没有内容')
        if self.type == 'heading' and (any(run.asset for run in self.runs) or not ''.join(run.text or '' for run in self.runs).strip()):
            raise ValueError('标题必须包含文字，暂不支持标题内图片或公式')
        if self.type == 'graphic' and not self.asset:
            raise ValueError('缺少图片引用')
        if self.type == 'table':
            if not self.rows or not 1 <= len(self.rows[0]) <= 6:
                raise ValueError('表格需有表头且最多支持 6 列')
            if any(len(row) != len(self.rows[0]) for row in self.rows):
                raise ValueError('表格列数不一致')
            if any(len(cell) > 200 or any(run.asset for run in cell) for row in self.rows for cell in row):
                raise ValueError('表格单元格过于复杂或含有暂不支持的图片/公式')
        return self


class OfficeSource(OfficeModel):
    blocks: list[OfficeBlock] = Field(min_length=1, max_length=500)
    assets: list[OfficeAsset] = Field(default_factory=list, max_length=128)


class OfficeMetadata(OfficeModel):
    subtitle: str = Field('', max_length=28)
    version: str = Field('', max_length=24)
    footer: str = Field('', max_length=24)

    @model_validator(mode='after')
    def single_line(self) -> Self:
        if any(c in value for value in (self.subtitle, self.version, self.footer) for c in '\n\r\t'):
            raise ValueError('封面及页脚信息必须为单行')
        return self


class OfficeRequest(OfficeModel):
    template: Literal['aibs-v1'] = 'aibs-v1'
    source: OfficeSource
    metadata: OfficeMetadata = Field(default_factory=OfficeMetadata)

    @model_validator(mode='after')
    def bounded_content(self, info: ValidationInfo) -> Self:
        blocks, assets = self.source.blocks, self.source.assets
        limits = (info.context or {}).get('office_limits', OfficeLimits())
        if len(assets) > limits.max_assets:
            raise ValueError(f'素材数量 {len(assets)} 个超过上限 {limits.max_assets} 个（图片、图表和公式均计数）')
        if len({b.id for b in blocks}) != len(blocks) or len({a.id for a in assets}) != len(assets):
            raise ValueError('内容块或图片 ID 重复')
        references, size, run_count = set(), 0, 0
        for block in blocks:
            if block.asset: references.add(block.asset)
            runs = block.runs + [run for row in block.rows for cell in row for run in cell]
            run_count += len(runs)
            size += len(block.text) + sum(len(run.text or '') for run in runs)
            references.update(run.asset for run in runs if run.asset)
        if references != {a.id for a in assets}: raise ValueError('存在缺失或未使用的图片')
        if size > 120_000 or run_count > 12_000: raise ValueError('正文超过 120,000 字符或内容片段过多，请拆分后导出')
        encoded = sum(len(a.data) for a in assets)
        if encoded > limits.max_total_bytes:
            raise ValueError(f'素材总编码 {encoded:,} 字节超过上限 {limits.max_total_bytes / 1_000_000:g} MB，请压缩图片或拆分文档')
        if not size and not references: raise ValueError('没有可导出的内容')
        def check(value):
            if isinstance(value, str):
                if any((ord(c) < 32 and c not in '\n\t\r') or 0xD800 <= ord(c) <= 0xDFFF or ord(c) in (0xFFFE, 0xFFFF) for c in value):
                    raise ValueError('内容包含 Office 不支持的控制字符')
            elif isinstance(value, dict):
                for key, item in value.items():
                    if key != 'data': check(item)
            elif isinstance(value, list):
                for item in value: check(item)
        check(self.model_dump())
        return self
