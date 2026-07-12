import { request } from "./client";

export interface MediaUploadResponse {
  id: number;
  public_id: string;
  url: string;
  markdown: string;
  original_filename: string | null;
  content_type: string;
  size_bytes: number;
  created_at: string | null;
}

export async function uploadMediaImage(file: File): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.set("file", file);

  return request<MediaUploadResponse>("/api/media", {
    method: "POST",
    body: formData,
  });
}
