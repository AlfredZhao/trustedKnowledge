import oracledb
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_api_key
from app.repositories.blog_factory import create_blog_factory_item
from app.schemas.blog_factory import BlogFactoryCreate, BlogFactoryItem


router = APIRouter(prefix="/blog-factory", tags=["blog-factory"], dependencies=[Depends(require_api_key)])


@router.post("", response_model=BlogFactoryItem, status_code=status.HTTP_201_CREATED)
async def post_blog_factory_item(payload: BlogFactoryCreate) -> BlogFactoryItem:
    try:
        created = await create_blog_factory_item(payload)
    except oracledb.Error as exc:
        error = exc.args[0] if exc.args else exc
        message = getattr(error, "message", str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Oracle rejected the blog factory entry: {message}",
        ) from exc

    if created is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge item not found")

    return BlogFactoryItem.model_validate(created)
