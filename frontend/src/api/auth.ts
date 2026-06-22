const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

export const API_KEY_STORAGE_KEY = "trustedKnowledge.apiKey";
export const AUTH_USER_STORAGE_KEY = "trustedKnowledge.authUser";

export interface AuthUser {
  username: string;
  is_admin: boolean;
  visible_users: string[];
}

interface LoginResponse {
  api_key: string;
  username: string;
  is_admin: boolean;
  visible_users: string[];
}

interface AuthConfigResponse {
  wechat_enabled: boolean;
}

interface WeChatLoginStartResponse {
  authorization_url: string;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    return typeof data.detail === "string" ? data.detail : fallback;
  } catch {
    return fallback;
  }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(response.status === 401 ? "用户名或密码不正确" : "登录失败，请稍后重试");
  }

  const data = (await response.json()) as LoginResponse;
  return data;
}

export async function fetchCurrentAuthUser(): Promise<AuthUser> {
  const apiKey = readStoredApiKey();
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
  });

  if (!response.ok) {
    clearStoredApiKey();
    window.dispatchEvent(new Event("trusted-knowledge:unauthorized"));
    throw new Error("登录状态已失效");
  }

  return response.json() as Promise<AuthUser>;
}

export async function fetchAuthConfig(): Promise<AuthConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/config`);

  if (!response.ok) {
    return { wechat_enabled: false };
  }

  return response.json() as Promise<AuthConfigResponse>;
}

export async function startWeChatLogin(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/wechat/start`);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "微信登录暂不可用"));
  }

  const data = (await response.json()) as WeChatLoginStartResponse;
  return data.authorization_url;
}

export function readStoredApiKey(): string | null {
  const localApiKey = window.localStorage.getItem(API_KEY_STORAGE_KEY);
  if (localApiKey) return localApiKey;

  const sessionApiKey = window.sessionStorage.getItem(API_KEY_STORAGE_KEY);
  if (!sessionApiKey) return null;

  window.localStorage.setItem(API_KEY_STORAGE_KEY, sessionApiKey);
  window.sessionStorage.removeItem(API_KEY_STORAGE_KEY);
  return sessionApiKey;
}

export function persistApiKey(apiKey: string) {
  window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  window.sessionStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function readStoredAuthUser(): AuthUser | null {
  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (typeof parsed.username !== "string" || typeof parsed.is_admin !== "boolean") return null;
    return {
      username: parsed.username,
      is_admin: parsed.is_admin,
      visible_users: Array.isArray(parsed.visible_users) ? parsed.visible_users.filter((item) => typeof item === "string") : [],
    };
  } catch {
    return null;
  }
}

export function persistAuthUser(user: AuthUser) {
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredApiKey() {
  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  window.sessionStorage.removeItem(API_KEY_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}
