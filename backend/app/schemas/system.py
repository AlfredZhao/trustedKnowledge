from pydantic import BaseModel, Field


class RestartRequest(BaseModel):
    confirm: str = Field(..., min_length=1, max_length=32)


class RestartResponse(BaseModel):
    accepted: bool
    message: str
    log_path: str


class GithubSyncResponse(BaseModel):
    success: bool
    message: str
    exit_code: int
    output_tail: str
    log_path: str
    completed_at: str


class GithubReleaseRequest(BaseModel):
    version: str = Field(..., pattern=r"^\d+\.\d+\.\d+$", max_length=32)
    confirm: str = Field(..., min_length=1, max_length=8)
