from pydantic import BaseModel, Field


class LlmConfigResponse(BaseModel):
    provider_name: str
    base_url: str
    model_name: str
    enabled: bool
    has_api_key: bool


class LlmConfigUpdate(BaseModel):
    provider_name: str = Field("OpenAI Compatible", max_length=100)
    base_url: str = Field("", max_length=1000)
    model_name: str = Field("", max_length=200)
    enabled: bool = False
