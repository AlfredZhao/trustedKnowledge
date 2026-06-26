import type {
  AdminModuleAccessItem,
  AdminModuleAccessLevel,
  AdminModuleAccessListResponse,
  ManagedUserCreateDraft,
  ManagedUserItem,
  ManagedUserListResponse,
  ManagedUserRole,
  ManagedUserStatus,
  UserRelationItem,
  UserRelationGraphResponse,
  UserRelationListResponse,
} from "../types";
import { clearStoredApiKey, readStoredApiKey } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map((item) => item.msg ?? "Validation error").join("; ");
    return null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = readStoredApiKey();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredApiKey();
      window.dispatchEvent(new Event("trusted-knowledge:unauthorized"));
    }
    const detail = await readErrorDetail(response);
    throw new Error(detail || `Request failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchManagedUsers(query: string): Promise<ManagedUserListResponse> {
  const search = new URLSearchParams();
  if (query.trim()) search.set("q", query.trim());
  return request<ManagedUserListResponse>(`/api/users${search.toString() ? `?${search.toString()}` : ""}`);
}

export async function createManagedUser(draft: ManagedUserCreateDraft): Promise<ManagedUserItem> {
  return request<ManagedUserItem>("/api/users", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export async function updateManagedUser(
  userId: number,
  payload: { display_name?: string | null; role_code?: ManagedUserRole; is_admin_role?: boolean; status?: ManagedUserStatus },
): Promise<ManagedUserItem> {
  return request<ManagedUserItem>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function resetManagedUserPassword(userId: number, password: string): Promise<ManagedUserItem> {
  return request<ManagedUserItem>(`/api/users/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function fetchUserRelations(): Promise<UserRelationListResponse> {
  return request<UserRelationListResponse>("/api/users/relations");
}

export async function fetchUserRelationGraph(): Promise<UserRelationGraphResponse> {
  return request<UserRelationGraphResponse>("/api/users/graph");
}

export async function createUserRelation(payload: {
  parent_user_id: number;
  child_user_id: number;
  relation_type: string;
}): Promise<UserRelationItem> {
  return request<UserRelationItem>("/api/users/relations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUserRelation(relationId: number, status: ManagedUserStatus): Promise<UserRelationItem> {
  return request<UserRelationItem>(`/api/users/relations/${relationId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchAdminModuleAccess(): Promise<AdminModuleAccessListResponse> {
  return request<AdminModuleAccessListResponse>("/api/users/admin-modules");
}

export async function updateAdminModuleAccess(
  moduleCode: AdminModuleAccessItem["module_code"],
  accessLevel: AdminModuleAccessLevel,
): Promise<AdminModuleAccessItem> {
  return request<AdminModuleAccessItem>(`/api/users/admin-modules/${moduleCode}`, {
    method: "PATCH",
    body: JSON.stringify({ access_level: accessLevel }),
  });
}
