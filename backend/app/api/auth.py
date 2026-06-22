import asyncio
import json
import logging
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.core.security import create_oauth_state, require_current_user, validate_oauth_state
from app.repositories.users import AuthContext, authenticate_user, list_visible_usernames
from app.schemas.auth import AuthConfigResponse, AuthUserResponse, LoginRequest, LoginResponse, WeChatLoginStartResponse


router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest) -> LoginResponse:
    result = await authenticate_user(payload.username, payload.password)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    api_key, context = result
    return LoginResponse(
        api_key=api_key,
        username=context.username,
        is_admin=context.is_admin,
        visible_users=await list_visible_usernames(context),
    )


@router.get("/me", response_model=AuthUserResponse)
async def get_current_auth_user(context: AuthContext = Depends(require_current_user)) -> AuthUserResponse:
    return AuthUserResponse(
        username=context.username,
        is_admin=context.is_admin,
        visible_users=await list_visible_usernames(context),
    )


@router.get("/config", response_model=AuthConfigResponse)
async def auth_config() -> AuthConfigResponse:
    return AuthConfigResponse(wechat_enabled=settings.wechat_enabled)


@router.get("/wechat/start", response_model=WeChatLoginStartResponse)
async def start_wechat_login() -> WeChatLoginStartResponse:
    if not settings.wechat_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WeChat login is not configured",
        )

    params = {
        "appid": settings.wechat_app_id,
        "redirect_uri": settings.wechat_redirect_uri,
        "response_type": "code",
        "scope": "snsapi_login",
        "state": create_oauth_state(),
    }
    authorization_url = f"https://open.weixin.qq.com/connect/qrconnect?{urlencode(params)}#wechat_redirect"
    return WeChatLoginStartResponse(authorization_url=authorization_url)


@router.get("/wechat/callback")
async def wechat_callback(code: str | None = None, state: str | None = None) -> RedirectResponse:
    if not settings.wechat_enabled:
        return redirect_to_login_error("微信登录未配置")

    if not code or not validate_oauth_state(state):
        return redirect_to_login_error("微信登录请求已失效，请重试")

    try:
        identity = await asyncio.to_thread(exchange_wechat_code, code)
    except WeChatAuthError as error:
        return redirect_to_login_error(str(error))

    if not is_wechat_identity_allowed(identity):
        logger.warning(
            "Denied WeChat login for openid=%s unionid=%s",
            identity.get("openid", ""),
            identity.get("unionid", ""),
        )
        return redirect_to_login_error("当前微信账号未加入系统白名单")

    return redirect_to_login_success(settings.api_key)


class WeChatAuthError(Exception):
    pass


def exchange_wechat_code(code: str) -> dict[str, str]:
    params = {
        "appid": settings.wechat_app_id,
        "secret": settings.wechat_app_secret,
        "code": code,
        "grant_type": "authorization_code",
    }
    url = f"https://api.weixin.qq.com/sns/oauth2/access_token?{urlencode(params)}"

    try:
        with urlopen(url, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise WeChatAuthError("微信认证服务暂不可用") from error

    if "errcode" in payload:
        raise WeChatAuthError("微信授权失败，请重试")

    openid = str(payload.get("openid") or "")
    unionid = str(payload.get("unionid") or "")
    if not openid:
        raise WeChatAuthError("微信授权结果缺少 openid")

    return {"openid": openid, "unionid": unionid}


def is_wechat_identity_allowed(identity: dict[str, str]) -> bool:
    allowed_openids = settings.wechat_allowed_openid_set
    allowed_unionids = settings.wechat_allowed_unionid_set
    if not allowed_openids and not allowed_unionids:
        return False

    openid = identity.get("openid", "")
    unionid = identity.get("unionid", "")
    return bool((openid and openid in allowed_openids) or (unionid and unionid in allowed_unionids))


def redirect_to_login_success(api_key: str) -> RedirectResponse:
    params = urlencode({"wechat_api_key": api_key})
    return RedirectResponse(f"{settings.frontend_base_url.rstrip('/')}/#{params}")


def redirect_to_login_error(message: str) -> RedirectResponse:
    params = urlencode({"wechat_error": message})
    return RedirectResponse(f"{settings.frontend_base_url.rstrip('/')}/#{params}")
