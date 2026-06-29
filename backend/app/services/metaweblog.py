from __future__ import annotations

import asyncio
import html
import re
import urllib.error
import urllib.request
import xmlrpc.client
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse


class MetaWeblogError(Exception):
    pass


@dataclass(frozen=True)
class MetaWeblogBlogInfo:
    blog_id: str
    blog_name: str | None
    blog_url: str | None


@dataclass(frozen=True)
class MetaWeblogValidationResult:
    blog_id: str
    blog_name: str | None
    blog_url: str | None


@dataclass(frozen=True)
class MetaWeblogPublishResult:
    post_id: str
    blog_id: str
    blog_name: str | None
    blog_url: str | None


async def validate_metaweblog_config(
    *,
    api_url: str,
    username: str,
    password: str,
    blog_url: str | None = None,
    blog_name: str | None = None,
    blog_id: str | None = None,
) -> MetaWeblogValidationResult:
    resolved = await _resolve_blog(
        api_url=api_url,
        username=username,
        password=password,
        preferred_blog_url=blog_url,
        preferred_blog_name=blog_name,
        preferred_blog_id=blog_id,
    )
    return MetaWeblogValidationResult(
        blog_id=resolved.blog_id,
        blog_name=resolved.blog_name,
        blog_url=resolved.blog_url,
    )


async def publish_metaweblog_post(
    *,
    api_url: str,
    username: str,
    password: str,
    title: str,
    markdown: str,
    tags: list[str],
    publish: bool,
    blog_url: str | None = None,
    blog_name: str | None = None,
    blog_id: str | None = None,
) -> MetaWeblogPublishResult:
    resolved = await _resolve_blog(
        api_url=api_url,
        username=username,
        password=password,
        preferred_blog_url=blog_url,
        preferred_blog_name=blog_name,
        preferred_blog_id=blog_id,
    )
    content = {
        "title": title,
        "description": markdown_to_html(markdown),
    }
    cleaned_tags = [tag for tag in dict.fromkeys(_clean_tag(tag) for tag in tags) if tag]
    if cleaned_tags:
        content["categories"] = cleaned_tags
        content["mt_keywords"] = ", ".join(cleaned_tags)

    response = await _call_xmlrpc(
        api_url,
        "metaWeblog.newPost",
        (resolved.blog_id, username, password, content, bool(publish)),
    )
    post_id = str(response).strip()
    if not post_id:
        raise MetaWeblogError("Metaweblog 返回了空的文章 ID。")

    return MetaWeblogPublishResult(
        post_id=post_id,
        blog_id=resolved.blog_id,
        blog_name=resolved.blog_name,
        blog_url=resolved.blog_url,
    )


def markdown_to_html(markdown: str) -> str:
    lines = remove_leaked_markdown_code_placeholders(markdown).replace("\r\n", "\n").split("\n")
    output: list[str] = []
    paragraph: list[str] = []
    list_type: str | None = None
    list_items: list[str] = []
    in_code_block = False
    code_language = ""
    code_lines: list[str] = []

    def flush_paragraph() -> None:
        nonlocal paragraph
        if not paragraph:
            return
        output.append(f"<p>{_format_inline_markdown(' '.join(paragraph))}</p>")
        paragraph = []

    def flush_list() -> None:
        nonlocal list_type, list_items
        if not list_type or not list_items:
            return
        items = "".join(f"<li>{_format_inline_markdown(item)}</li>" for item in list_items)
        output.append(f"<{list_type}>{items}</{list_type}>")
        list_type = None
        list_items = []

    def flush_code_block() -> None:
        nonlocal in_code_block, code_language, code_lines
        language_class = f' class="language-{_escape_attribute(code_language)}"' if code_language else ""
        output.append(f"<pre><code{language_class}>{html.escape(chr(10).join(code_lines))}</code></pre>")
        in_code_block = False
        code_language = ""
        code_lines = []

    index = 0
    while index < len(lines):
        line = lines[index]
        code_fence = re.match(r"^```(\S*)\s*$", line)
        if code_fence:
            if in_code_block:
                flush_code_block()
            else:
                flush_paragraph()
                flush_list()
                in_code_block = True
                code_language = code_fence.group(1) or ""
                code_lines = []
            index += 1
            continue

        if in_code_block:
            code_lines.append(line)
            index += 1
            continue

        if not line.strip():
            flush_paragraph()
            flush_list()
            index += 1
            continue

        if (
            _is_markdown_table_header(line)
            and index + 1 < len(lines)
            and _is_markdown_table_delimiter(lines[index + 1])
        ):
            flush_paragraph()
            flush_list()
            header_cells = _parse_markdown_table_cells(line)
            alignments = _parse_markdown_table_alignments(lines[index + 1])
            body_rows: list[list[str]] = []
            index += 2
            while index < len(lines) and _is_markdown_table_row(lines[index]):
                body_rows.append(_parse_markdown_table_cells(lines[index]))
                index += 1
            output.append(_render_markdown_table(header_cells, alignments, body_rows))
            continue

        heading = re.match(r"^(#{1,3})\s+(.+)$", line)
        if heading:
            flush_paragraph()
            flush_list()
            level = len(heading.group(1))
            output.append(f"<h{level}>{_format_inline_markdown(heading.group(2))}</h{level}>")
            index += 1
            continue

        quote = re.match(r"^>\s?(.+)$", line)
        if quote:
            flush_paragraph()
            flush_list()
            output.append(f"<blockquote><p>{_format_inline_markdown(quote.group(1))}</p></blockquote>")
            index += 1
            continue

        unordered_item = re.match(r"^\s*[-*]\s+(.+)$", line)
        if unordered_item:
            flush_paragraph()
            if list_type != "ul":
                flush_list()
            list_type = "ul"
            list_items.append(unordered_item.group(1))
            index += 1
            continue

        ordered_item = re.match(r"^\s*\d+\.\s+(.+)$", line)
        if ordered_item:
            flush_paragraph()
            if list_type != "ol":
                flush_list()
            list_type = "ol"
            list_items.append(ordered_item.group(1))
            index += 1
            continue

        paragraph.append(line.strip())
        index += 1

    if in_code_block:
        flush_code_block()
    flush_paragraph()
    flush_list()
    return "".join(output)


def remove_leaked_markdown_code_placeholders(markdown: str) -> str:
    pattern = re.compile(r"[ \t]*(?:@@CODE_?\d+@@|\uE000CODE_?\d+\uE001)[ \t]*")

    def replace(match: re.Match[str]) -> str:
        source = match.string
        start = match.start()
        end = match.end()
        before = source[start - 1] if start > 0 else ""
        after = source[end] if end < len(source) else ""
        return " " if _should_keep_placeholder_gap(before, after) else ""

    cleaned = pattern.sub(replace, markdown)
    return re.sub(r"[ \t]{2,}", " ", cleaned)


async def _resolve_blog(
    *,
    api_url: str,
    username: str,
    password: str,
    preferred_blog_url: str | None,
    preferred_blog_name: str | None,
    preferred_blog_id: str | None,
) -> MetaWeblogBlogInfo:
    blogs = await _get_user_blogs(api_url, username, password)
    if not blogs:
      raise MetaWeblogError("Metaweblog 未返回任何博客站点。")

    normalized_url = _normalize_url(preferred_blog_url)
    normalized_name = (preferred_blog_name or "").strip().casefold()
    normalized_id = (preferred_blog_id or "").strip()
    url_suffix = _extract_cnblogs_suffix(preferred_blog_url)

    for blog in blogs:
        if normalized_id and blog.blog_id == normalized_id:
            return blog
    for blog in blogs:
        if normalized_url and _normalize_url(blog.blog_url) == normalized_url:
            return blog
    for blog in blogs:
        if normalized_name and (blog.blog_name or "").strip().casefold() == normalized_name:
            return blog
    for blog in blogs:
        if url_suffix:
            parsed = urlparse(blog.blog_url or "")
            candidate_suffix = parsed.path.strip("/").split("/")[-1] if parsed.path else ""
            if candidate_suffix == url_suffix:
                return blog

    return blogs[0]


async def _get_user_blogs(api_url: str, username: str, password: str) -> list[MetaWeblogBlogInfo]:
    for method in ("metaWeblog.getUsersBlogs", "blogger.getUsersBlogs"):
        try:
            response = await _call_xmlrpc(api_url, method, ("", username, password))
            return _normalize_blog_list(response)
        except MetaWeblogError:
            if method == "blogger.getUsersBlogs":
                raise
    return []


def _normalize_blog_list(value: Any) -> list[MetaWeblogBlogInfo]:
    raw_items = value if isinstance(value, (list, tuple)) else [value]
    blogs: list[MetaWeblogBlogInfo] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        blog_id = str(item.get("blogid") or item.get("blogId") or item.get("id") or "").strip()
        if not blog_id:
            continue
        blog_name = str(item.get("blogName") or item.get("blog_name") or item.get("title") or "").strip() or None
        blog_url = str(item.get("url") or item.get("blogUrl") or item.get("link") or "").strip() or None
        blogs.append(MetaWeblogBlogInfo(blog_id=blog_id, blog_name=blog_name, blog_url=blog_url))
    return blogs


async def _call_xmlrpc(api_url: str, method_name: str, params: tuple[Any, ...]) -> Any:
    return await asyncio.to_thread(_call_xmlrpc_sync, api_url, method_name, params)


def _call_xmlrpc_sync(api_url: str, method_name: str, params: tuple[Any, ...]) -> Any:
    payload = xmlrpc.client.dumps(params, methodname=method_name, allow_none=True).encode("utf-8")
    request = urllib.request.Request(
        api_url,
        data=payload,
        headers={"Content-Type": "text/xml"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            response_body = response.read()
    except urllib.error.HTTPError as exc:
        response_body = exc.read()
        _raise_xmlrpc_fault_or_http_error(exc, response_body)
    except urllib.error.URLError as exc:
        reason = exc.reason if isinstance(exc.reason, str) else str(exc.reason)
        raise MetaWeblogError(f"Metaweblog 请求失败：{reason}") from exc
    except OSError as exc:
        raise MetaWeblogError(f"Metaweblog 网络连接失败：{exc}") from exc

    try:
        values, _ = xmlrpc.client.loads(response_body)
    except xmlrpc.client.Fault as exc:
        raise MetaWeblogError(_extract_fault_message(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive parse fallback
        raise MetaWeblogError("Metaweblog 返回内容无法解析。") from exc

    if not values:
        return None
    return values[0] if len(values) == 1 else values


def _raise_xmlrpc_fault_or_http_error(exc: urllib.error.HTTPError, response_body: bytes) -> None:
    try:
        xmlrpc.client.loads(response_body)
    except xmlrpc.client.Fault as fault:
        raise MetaWeblogError(_extract_fault_message(fault)) from exc
    except Exception:
        pass
    raise MetaWeblogError(f"Metaweblog 返回 HTTP {exc.code}: {exc.reason}") from exc


def _extract_fault_message(fault: xmlrpc.client.Fault) -> str:
    message = str(fault.faultString or "").strip()
    if not message:
        return f"Metaweblog 调用失败，faultCode={fault.faultCode}"
    return message


def _render_markdown_table(headers: list[str], alignments: list[str], body_rows: list[list[str]]) -> str:
    normalized_headers = _normalize_table_row(headers, len(headers))
    head_cells = "".join(
        f"<th{_alignment_attribute(alignments[index] if index < len(alignments) else '')}>{_format_inline_markdown(cell)}</th>"
        for index, cell in enumerate(normalized_headers)
    )
    body_html = []
    for row in body_rows:
        normalized_row = _normalize_table_row(row, len(headers))
        cells = "".join(
            f"<td{_alignment_attribute(alignments[index] if index < len(alignments) else '')}>{_format_inline_markdown(cell)}</td>"
            for index, cell in enumerate(normalized_row)
        )
        body_html.append(f"<tr>{cells}</tr>")
    return f'<div class="tk-table-wrapper"><table><thead><tr>{head_cells}</tr></thead><tbody>{"".join(body_html)}</tbody></table></div>'


def _normalize_table_row(row: list[str], target_length: int) -> list[str]:
    return [(row[index] if index < len(row) else "") for index in range(target_length)]


def _alignment_attribute(value: str) -> str:
    return f' data-align="{value}"' if value else ""


def _is_markdown_table_header(line: str) -> bool:
    trimmed = line.strip()
    return "|" in trimmed and len(_parse_markdown_table_cells(trimmed)) > 1


def _is_markdown_table_delimiter(line: str) -> bool:
    cells = _parse_markdown_table_cells(line)
    return len(cells) > 1 and all(re.match(r"^:?-{3,}:?$", cell.strip()) for cell in cells)


def _is_markdown_table_row(line: str) -> bool:
    trimmed = line.strip()
    if not trimmed or "|" not in trimmed or trimmed.startswith("```"):
        return False
    return len(_parse_markdown_table_cells(trimmed)) > 1


def _parse_markdown_table_alignments(line: str) -> list[str]:
    result: list[str] = []
    for cell in _parse_markdown_table_cells(line):
        trimmed = cell.strip()
        if trimmed.startswith(":") and trimmed.endswith(":"):
            result.append("center")
        elif trimmed.endswith(":"):
            result.append("right")
        elif trimmed.startswith(":"):
            result.append("left")
        else:
            result.append("")
    return result


def _parse_markdown_table_cells(line: str) -> list[str]:
    trimmed = line.strip()
    if trimmed.startswith("|"):
        trimmed = trimmed[1:]
    if trimmed.endswith("|"):
        trimmed = trimmed[:-1]
    cells: list[str] = []
    current: list[str] = []
    escaped = False
    for char in trimmed:
        if escaped:
            current.append(char)
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == "|":
            cells.append("".join(current).strip())
            current = []
            continue
        current.append(char)
    cells.append("".join(current).strip())
    return cells


def _format_inline_markdown(text: str) -> str:
    placeholders: list[str] = []

    def code_replace(match: re.Match[str]) -> str:
        index = len(placeholders)
        placeholders.append(f"<code>{html.escape(match.group(1))}</code>")
        return f"TKMDINLINECODE{index}ENDTK"

    value = html.escape(text)
    value = re.sub(r"`([^`]+)`", code_replace, value)
    value = re.sub(r"!\[([^\]]*)\]\(([^)\s]+)\)", _replace_image, value)
    value = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", _replace_link, value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"__([^_]+)__", r"<strong>\1</strong>", value)
    value = re.sub(r"(^|[^*])\*([^*]+)\*", r"\1<em>\2</em>", value)
    value = re.sub(r"(^|[^_])_([^_]+)_", r"\1<em>\2</em>", value)
    for index, placeholder in enumerate(placeholders):
        value = value.replace(f"TKMDINLINECODE{index}ENDTK", placeholder)
    return value


def _replace_image(match: re.Match[str]) -> str:
    alt = html.escape(match.group(1))
    url = _sanitize_url(match.group(2))
    if not url:
        return alt
    return f'<img src="{html.escape(url, quote=True)}" alt="{alt}" loading="lazy" />'


def _replace_link(match: re.Match[str]) -> str:
    label = match.group(1)
    url = _sanitize_url(match.group(2))
    if not url:
        return label
    return f'<a href="{html.escape(url, quote=True)}" target="_blank" rel="noreferrer">{label}</a>'


def _sanitize_url(value: str) -> str:
    normalized = value.replace("&amp;", "&")
    if re.match(r"^(https?:|mailto:)", normalized, re.IGNORECASE):
        return normalized
    if normalized.startswith(("#", "/", "./", "../")):
        return normalized
    if re.match(r"^[^:/?#\s][^\s]*$", normalized):
        return normalized
    return ""


def _escape_attribute(value: str) -> str:
    return html.escape(value, quote=True)


def _should_keep_placeholder_gap(before: str, after: str) -> bool:
    return bool(re.match(r"[A-Za-z0-9)\]]", before)) and bool(re.match(r"[A-Za-z0-9([]", after))


def _normalize_url(value: str | None) -> str:
    normalized = (value or "").strip().rstrip("/")
    return normalized.casefold()


def _extract_cnblogs_suffix(value: str | None) -> str:
    parsed = urlparse((value or "").strip())
    path = parsed.path.strip("/")
    if not path:
        return ""
    return path.split("/")[-1]


def _clean_tag(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip())
