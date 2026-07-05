import re
from urllib.parse import urlparse


CONTROL_CHAR_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
TOPIC_TAG_PATTERN = re.compile(r"^[\w\s,，._#:/+-]+$", re.UNICODE)


def normalize_optional_short_text(value: str | None, *, field_name: str, max_length: int) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")
    stripped = value.strip()
    if not stripped:
        return None
    if len(stripped) > max_length:
        raise ValueError(f"{field_name} cannot exceed {max_length} characters")
    if CONTROL_CHAR_PATTERN.search(stripped):
        raise ValueError(f"{field_name} cannot contain control characters")
    return stripped


def normalize_optional_topic_tag(value: str | None, *, max_length: int = 100) -> str | None:
    normalized = normalize_optional_short_text(value, field_name="topic_tag", max_length=max_length)
    if normalized is None:
        return None
    if not TOPIC_TAG_PATTERN.fullmatch(normalized):
        raise ValueError("topic_tag can only contain letters, numbers, Chinese characters, spaces, comma, underscore, dot, #, :, /, + or -")
    return normalized


def normalize_required_url(value: str, *, field_name: str, max_length: int) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")
    stripped = value.strip()
    if not stripped:
        raise ValueError(f"{field_name} cannot be blank")
    if len(stripped) > max_length:
        raise ValueError(f"{field_name} cannot exceed {max_length} characters")
    if CONTROL_CHAR_PATTERN.search(stripped) or any(char.isspace() for char in stripped):
        raise ValueError(f"{field_name} must be a URL without whitespace")
    parsed = urlparse(stripped)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"{field_name} must be a valid http(s) URL")
    return stripped


def normalize_optional_file_path(value: str | None, *, field_name: str = "article_file_path", max_length: int = 500) -> str | None:
    normalized = normalize_optional_short_text(value, field_name=field_name, max_length=max_length)
    if normalized is None:
        return None
    if "\n" in normalized or "\r" in normalized:
        raise ValueError(f"{field_name} cannot contain line breaks")
    return normalized
