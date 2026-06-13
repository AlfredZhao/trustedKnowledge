from typing import Literal

from pydantic import BaseModel, Field


class CodexRunRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=12000)


class CodexRunResponse(BaseModel):
    output: str
    error_output: str
    exit_code: int
    duration_seconds: float
    git_status: str


CodexJobStatus = Literal["running", "completed", "failed"]


class CodexJobSnapshot(BaseModel):
    job_id: str
    prompt: str
    status: CodexJobStatus
    output: str
    error_output: str
    response: CodexRunResponse | None
    error_message: str | None
    started_at: str
    completed_at: str | None
