from pydantic import BaseModel, Field


class CodexRunRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=12000)


class CodexRunResponse(BaseModel):
    output: str
    error_output: str
    exit_code: int
    duration_seconds: float
    git_status: str
