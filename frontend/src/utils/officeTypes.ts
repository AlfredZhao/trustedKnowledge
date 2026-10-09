export interface OfficeRun { text?: string; asset?: string; alt?: string; bold?: boolean; italic?: boolean; code?: boolean; href?: string; }
export interface OfficeAsset { id: string; kind: "image" | "formula" | "mermaid"; alt: string; width: number; height: number; data: string; }
export interface OfficeBlock {
  id: string; type: "heading" | "paragraph" | "code" | "graphic" | "table" | "break" | "rule";
  sourceStart: number; sourceEnd: number; runs?: OfficeRun[]; level?: number; text?: string; language?: string;
  asset?: string; alt?: string; rows?: OfficeRun[][][]; list?: "ul" | "ol"; prefix?: string; quote?: boolean;
}
export interface OfficeSource { blocks: OfficeBlock[]; assets: OfficeAsset[]; }
export interface OfficeLimits {
  max_assets: number; max_asset_bytes: number; max_total_bytes: number; max_total_pixels: number;
  max_body_bytes: number; max_output_bytes: number; max_job_seconds: number; client_timeout_seconds: number;
}
export interface OfficeMetadata { subtitle: string; version: string; footer: string; }
export interface OfficePayload { template: "aibs-v1"; source: OfficeSource; metadata: OfficeMetadata; }
export interface OfficeElement {
  name: string; kind: "text" | "image" | "table" | "rule"; block: string | null;
  x: number; y: number; w: number; h: number; size?: number; bold?: boolean; code?: boolean; quote?: boolean;
  runs?: OfficeRun[]; line_runs?: OfficeRun[][]; asset?: string; rows?: OfficeRun[][][]; widths?: number[]; heights?: number[];
}
export interface OfficePage { layout: "cover" | "content"; title: string; elements: OfficeElement[]; notes?: Array<{ block: string; text: string }>; }
export interface OfficeDecoration { x: number; y: number; w: number; h: number; src?: string; unsupported?: string; }
export interface OfficePreview {
  pages: OfficePage[]; decorations: Record<"cover" | "content", OfficeDecoration[]>;
  fonts: { latin: string; east_asia: string; code: string }; colors: Record<string, string>;
  copyright: string; footer: string; warnings: string[];
}
