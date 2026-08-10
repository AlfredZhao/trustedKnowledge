from typing import Literal

from pydantic import BaseModel, Field


class CodexRunRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=50000)
    skill_ids: list[str] = Field(default_factory=list, max_length=8)
    sandbox_mode: Literal["read-only", "workspace-write"] = "workspace-write"
    output_mode: Literal["full", "final"] = "full"
    model_name: str = Field("", max_length=120)
    execution_provider: Literal["codex", "history_ask_llm"] = "codex"


class CodexRunResponse(BaseModel):
    output: str
    error_output: str
    exit_code: int
    duration_seconds: float
    git_status: str
    model_name: str | None = None


CodexJobStatus = Literal["running", "completed", "failed"]


class CodexJobSnapshot(BaseModel):
    job_id: str
    prompt: str
    model_name: str | None = None
    status: CodexJobStatus
    output: str
    error_output: str
    response: CodexRunResponse | None
    error_message: str | None
    started_at: str
    completed_at: str | None


class CodexConfigResponse(BaseModel):
    default_model_name: str | None = None
    available_models: list[str] = Field(default_factory=list)
