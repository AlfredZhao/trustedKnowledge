"""Server-owned export policy, also passed explicitly to isolated workers."""
from pydantic import BaseModel, ConfigDict, Field


class OfficeLimits(BaseModel):
    model_config = ConfigDict(extra='forbid', frozen=True)
    max_assets: int = Field(64, ge=1, le=128)
    max_total_bytes: int = Field(48_000_000, ge=4_000_000, le=96_000_000)
    max_total_pixels: int = Field(128_000_000, ge=16_000_000, le=256_000_000)

    @property
    def max_body_bytes(self):
        return self.max_total_bytes + 8_000_000

    @property
    def max_output_bytes(self):
        return self.max_total_bytes + 16_000_000

    def public(self):
        return {**self.model_dump(), 'max_asset_bytes': 4_000_000,
                'max_body_bytes': self.max_body_bytes, 'max_output_bytes': self.max_output_bytes,
                'max_job_seconds': 90, 'client_timeout_seconds': 180}
