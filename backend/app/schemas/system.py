from pydantic import BaseModel, Field


class RestartRequest(BaseModel):
    confirm: str = Field(..., min_length=1, max_length=32)


class RestartResponse(BaseModel):
    accepted: bool
    message: str
    log_path: str
