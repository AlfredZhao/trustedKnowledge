import { authFetch, readErrorMessage } from "./client";
import { clearStoredApiKey } from "./auth";
import type { OfficeLimits, OfficePayload, OfficePreview } from "../utils/officeTypes";
import { sessionIdentity } from "../utils/markdownSlidesSession";

export async function officeRequest(path: string, options: RequestInit): Promise<Response> {
  const owner = sessionIdentity();
  const response = await authFetch(path, { ...options, cache: "no-store", redirect: "error" });
  if (owner !== sessionIdentity()) throw new DOMException("登录会话已变化", "AbortError");
  if (!response.ok) {
    if (response.status === 401) {
      clearStoredApiKey(); window.dispatchEvent(new Event("trusted-knowledge:unauthorized"));
    }
    throw new Error(await readErrorMessage(response) || `请求失败（${response.status}），请稍后重试。`);
  }
  return response;
}

export async function getOfficeLimits(signal: AbortSignal): Promise<OfficeLimits> {
  const response = await officeRequest("/api/markdown/office/limits", { signal });
  const limits = await response.json() as OfficeLimits;
  const keys: Array<keyof OfficeLimits> = ["max_assets", "max_asset_bytes", "max_total_bytes", "max_total_pixels", "max_body_bytes", "max_output_bytes", "max_job_seconds", "client_timeout_seconds"];
  if (!limits || keys.some(key => !Number.isSafeInteger(limits[key]) || limits[key] <= 0) || limits.client_timeout_seconds > 600) {
    throw new Error("无法读取有效的导出限制，请确认前后端已同步更新后重试。");
  }
  return limits;
}

export async function previewOffice(payload: OfficePayload, signal: AbortSignal): Promise<OfficePreview> {
  const response = await officeRequest("/api/markdown/office/preview", { method: "POST", body: JSON.stringify(payload), signal });
  return response.json() as Promise<OfficePreview>;
}

export async function downloadOffice(payload: OfficePayload, format: "pptx" | "docx", title: string, signal: AbortSignal) {
  const owner = sessionIdentity();
  const response = await officeRequest(`/api/markdown/office/export/${format}`, { method: "POST", body: JSON.stringify(payload), signal });
  const blob = await response.blob();
  signal.throwIfAborted();
  if (owner !== sessionIdentity()) throw new DOMException("登录会话已变化", "AbortError");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.replace(/[\x00-\x1f<>:"/\\|?*]/g, "_").slice(0, 80) || "Markdown"}.${format}`;
  anchor.style.display = "none";
  document.body.append(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
