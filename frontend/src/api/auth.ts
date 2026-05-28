const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

export const API_KEY_STORAGE_KEY = "trustedKnowledge.apiKey";

interface LoginResponse {
  api_key: string;
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

export async function login(username: string, password: string): Promise<string> {
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
  return data.api_key;
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
