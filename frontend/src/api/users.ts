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
import { buildQuery, request } from "./client";

export async function fetchManagedUsers(query: string): Promise<ManagedUserListResponse> {
  return request<ManagedUserListResponse>(`/api/users${buildQuery({ q: query })}`);
}

export async function createManagedUser(draft: ManagedUserCreateDraft): Promise<ManagedUserItem> {
  return request<ManagedUserItem>("/api/users", {
    method: "POST",
    invalidatePrefixes: ["/api/users"],
    body: JSON.stringify(draft),
  });
}

export async function updateManagedUser(
  userId: number,
  payload: { display_name?: string | null; role_code?: ManagedUserRole; is_admin_role?: boolean; status?: ManagedUserStatus },
): Promise<ManagedUserItem> {
  return request<ManagedUserItem>(`/api/users/${userId}`, {
    method: "PATCH",
    invalidatePrefixes: ["/api/users"],
    body: JSON.stringify(payload),
  });
}

export async function resetManagedUserPassword(userId: number, password: string): Promise<ManagedUserItem> {
  return request<ManagedUserItem>(`/api/users/${userId}/reset-password`, {
    method: "POST",
    invalidatePrefixes: ["/api/users"],
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
    invalidatePrefixes: ["/api/users"],
    body: JSON.stringify(payload),
  });
}

export async function updateUserRelation(relationId: number, status: ManagedUserStatus): Promise<UserRelationItem> {
  return request<UserRelationItem>(`/api/users/relations/${relationId}`, {
    method: "PATCH",
    invalidatePrefixes: ["/api/users"],
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
    invalidatePrefixes: ["/api/users"],
    body: JSON.stringify({ access_level: accessLevel }),
  });
}
