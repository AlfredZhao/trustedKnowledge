from pydantic import BaseModel, Field


class LlmModelConfigResponse(BaseModel):
    id: int
    display_name: str
    provider_name: str
    base_url: str
    model_name: str
    api_key_env_var: str
    enabled: bool
    sort_order: int
    has_api_key: bool


class LlmModelConfigListResponse(BaseModel):
    items: list[LlmModelConfigResponse]


class LlmModelConfigInput(BaseModel):
    display_name: str = Field("", max_length=160)
    provider_name: str = Field("OpenAI Compatible", max_length=100)
    base_url: str = Field("", max_length=1000)
    model_name: str = Field("", max_length=200)
    api_key_env_var: str = Field("TRUSTED_KNOWLEDGE_HISTORY_ASK_LLM_API_KEY", max_length=160)
    enabled: bool = True
    sort_order: int = Field(0, ge=0, le=99999999)


LlmConfigResponse = LlmModelConfigResponse
LlmConfigUpdate = LlmModelConfigInput
