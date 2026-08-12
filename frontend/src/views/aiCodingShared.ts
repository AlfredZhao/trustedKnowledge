import type { CodexConfig } from "../types";

export const AI_CODING_DEFAULT_MODEL = "__codex_cli_default__";
// Keep this in sync with the Codex CLI model presets returned by the backend.
// `gpt-5.6` is a CLI default alias; the explicit choices are the three
// GPT-5.6 family models.
export const AI_CODING_MODEL_FALLBACK_OPTIONS = ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"];

export function buildAiCodingModelOptions(config: CodexConfig | null) {
  const uniqueValues = Array.from(new Set([...(config?.available_models ?? []), ...AI_CODING_MODEL_FALLBACK_OPTIONS]));
  return [
    {
      value: AI_CODING_DEFAULT_MODEL,
      label: config?.default_model_name ? `CLI 默认（当前 ${config.default_model_name}）` : "CLI 默认",
    },
    ...uniqueValues.map((value) => ({ value, label: value })),
  ];
}

export function formatAiCodingModelLabel(modelName: string | null | undefined, defaultModelName: string | null | undefined) {
  if (modelName && modelName.trim()) return modelName;
  if (defaultModelName && defaultModelName.trim()) return `CLI 默认（当前 ${defaultModelName}）`;
  return "CLI 默认";
}
