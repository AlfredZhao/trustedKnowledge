from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MediaUploadResponse(BaseModel):
    id: int
    public_id: str
    url: str
    markdown: str
    original_filename: str | None = None
    content_type: str
    size_bytes: int
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
