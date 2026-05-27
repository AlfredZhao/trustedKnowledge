const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

export const API_KEY_STORAGE_KEY = "trustedKnowledge.apiKey";

interface LoginResponse {
  api_key: string;
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

