import type { OfficeAsset, OfficeLimits } from "./officeTypes";

// Limits are fetched from the authenticated server policy, never user overrides.
// Sizes are encoded bytes, not original media or the resulting Office package.
const labels = { image: "图片", mermaid: "Mermaid 图", formula: "公式" };

function encodedSize(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(2)} MB（${bytes.toLocaleString("en-US")} 字节）`;
}

export function assertOfficeAssetCount(kinds: OfficeAsset["kind"][], limits: OfficeLimits): void {
  if (kinds.length <= limits.max_assets) return;
  const count = (kind: OfficeAsset["kind"]) => kinds.filter(value => value === kind).length;
  throw new Error(`素材数量超过限制：共 ${kinds.length} 个（图片 ${count("image")}、Mermaid 图 ${count("mermaid")}、公式 ${count("formula")}），最多 ${limits.max_assets} 个。图表和公式也计入数量，请拆分文档后导出。`);
}

export function assertOfficeAssetSize(assets: OfficeAsset[], item: OfficeAsset, limits: OfficeLimits): void {
  const number = assets.filter(asset => asset.kind === item.kind).length + 1;
  const alt = item.alt.replace(/\s+/g, " ").trim();
  const label = `第 ${number} 个${labels[item.kind]}${alt ? `「${alt.slice(0, 60)}${alt.length > 60 ? "…" : ""}」` : ""}`;
  if (item.data.length > limits.max_asset_bytes) {
    throw new Error(`单个素材编码大小超过限制：${label}为 ${encodedSize(item.data.length)}，单个上限 ${limits.max_asset_bytes / 1_000_000} MB（Base64 编码）。请压缩图片或简化图表/公式后重试。`);
  }
  const total = assets.reduce((sum, asset) => sum + asset.data.length, 0) + item.data.length;
  if (total > limits.max_total_bytes) {
    throw new Error(`素材总编码大小超过限制：处理至${label}时，已处理 ${assets.length + 1} 个素材，累计 ${encodedSize(total)}，总上限 ${limits.max_total_bytes / 1_000_000} MB（Base64 编码，非导出文件大小）。请拆分文档或压缩图片；图表和公式也计入总量。`);
  }
}

export function assertOfficeAssets(assets: OfficeAsset[], limits: OfficeLimits): void {
  assertOfficeAssetCount(assets.map(asset => asset.kind), limits);
  assets.forEach((asset, index) => assertOfficeAssetSize(assets.slice(0, index), asset, limits));
}
