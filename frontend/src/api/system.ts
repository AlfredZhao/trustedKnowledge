import type { GithubSyncResponse, SystemRestartResponse } from "../types";
import { apiUrl, request } from "./client";

export async function restartServices(): Promise<SystemRestartResponse> {
  return request<SystemRestartResponse>("/api/system/restart", {
    method: "POST",
    body: JSON.stringify({ confirm: "RESTART" }),
  });
}

export async function syncCodeToGithub(): Promise<GithubSyncResponse> {
  return request<GithubSyncResponse>("/api/system/github-sync", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(apiUrl("/health"), { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}
