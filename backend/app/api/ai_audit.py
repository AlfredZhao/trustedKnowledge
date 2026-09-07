from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query

from app.core.security import require_admin_user
from app.repositories.users import AuthContext
from app.schemas.ai_audit import AiAuditDashboardResponse
from app.services.ai_audit_dashboard import get_ai_audit_dashboard


router = APIRouter(prefix="/ai-audit", tags=["ai-audit"])


@router.get("/dashboard", response_model=AiAuditDashboardResponse)
async def get_dashboard(
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    username: str | None = None,
    source: str | None = None,
    model_name: str | None = None,
    event: Literal["completed", "failed", "timed_out", "cancelled", "started"] | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    _: AuthContext = Depends(require_admin_user),
) -> AiAuditDashboardResponse:
    return AiAuditDashboardResponse(
        **get_ai_audit_dashboard(days=days, username=username, source=source, model_name=model_name, event=event, limit=limit, offset=offset)
    )
