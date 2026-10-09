import re
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, Request, Response

from app.core.security import require_current_user
from app.repositories.users import AuthContext
from app.services.office.jobs import execute, export_limits

router = APIRouter(prefix='/markdown/office', tags=['markdown-office'])
PRIVATE_HEADERS = {'Cache-Control': 'no-store, private', 'Pragma': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Vary': 'X-API-Key'}


@router.get('/limits')
async def office_limits(response: Response, auth: AuthContext = Depends(require_current_user)):
    response.headers.update(PRIVATE_HEADERS)
    return export_limits().public()


@router.post('/preview')
async def preview_office(request: Request, auth: AuthContext = Depends(require_current_user)):
    body, _ = await execute(request, auth.user_id, 'preview')
    return Response(body, media_type='application/json', headers=PRIVATE_HEADERS)


@router.post('/export/{format}')
async def export_office(format: Literal['pptx', 'docx'], request: Request, auth: AuthContext = Depends(require_current_user)):
    body, title = await execute(request, auth.user_id, format)
    filename = (re.sub(r'[\x00-\x1f<>:"/\\|?*]', '_', title).strip(' .')[:80] or 'Markdown') + '.' + format
    media = 'application/vnd.openxmlformats-officedocument.' + ('presentationml.presentation' if format == 'pptx' else 'wordprocessingml.document')
    return Response(body, media_type=media, headers={**PRIVATE_HEADERS, 'Content-Disposition': f"attachment; filename=markdown.{format}; filename*=UTF-8''{quote(filename, safe='')}"})
