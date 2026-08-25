from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field

from app.core.security import require_api_key, require_current_user
from app.repositories.agents import AgentPermissionError, AgentValidationError, list_agents, update_agent, update_personal_binding
from app.repositories.users import AuthContext

router = APIRouter(prefix="/agents", tags=["agents"], dependencies=[Depends(require_api_key)])

class AgentUpdate(BaseModel):
    system_skill_ids: list[str] = Field(default_factory=list, max_length=8)
    default_skill_ids: list[str] = Field(default_factory=list, max_length=8)
    allow_personal_skills: bool = True

class PersonalBindingUpdate(BaseModel):
    skill_ids: list[str] = Field(default_factory=list, max_length=8)
    default_skill_ids: list[str] = Field(default_factory=list, max_length=8)

@router.get("")
async def get_agents(auth: AuthContext = Depends(require_current_user)) -> dict:
    return {"items": list_agents(auth)}

@router.put("/{agent_code}")
async def put_agent(agent_code: Annotated[str, Path()], payload: AgentUpdate, auth: AuthContext = Depends(require_current_user)) -> dict:
    try:
        return update_agent(agent_code, auth=auth, **payload.model_dump())
    except AgentPermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except AgentValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.put("/{agent_code}/my-skills")
async def put_personal_binding(agent_code: Annotated[str, Path()], payload: PersonalBindingUpdate, auth: AuthContext = Depends(require_current_user)) -> dict:
    try:
        return update_personal_binding(agent_code, payload.skill_ids, payload.default_skill_ids, auth)
    except AgentPermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except AgentValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
