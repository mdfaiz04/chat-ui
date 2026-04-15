/**
 * Shared model configuration — single source of truth for frontend and backend.
 * Add new models here and they will automatically appear in the UI and be routed correctly.
 */

export type Provider = "gemini" | "ollama" | "openai";

export interface ModelConfig {
  /** Human-readable label shown in the UI dropdown */
  label: string;
  /** Short key sent from frontend to backend (e.g. "gemini", "ollama") */
  value: string;
  /** Actual model ID passed to the provider API */
  model: string;
  /** Which AI provider handles this model */
  provider: Provider;
}

export const MODELS: ModelConfig[] = [
  {
    label: "Gemini 2.5 Flash",
    value: "gemini",
    model: "gemini-2.5-flash",
    provider: "gemini",
  },
  {
    label: "Gemini 2.5 Pro",
    value: "gemini-pro",
    model: "gemini-2.5-pro",
    provider: "gemini",
  },
  {
    label: "Ollama (Local)",
    value: "ollama",
    model: "phi3",
    provider: "ollama",
  },
  {
    label: "GPT-OSS 120B",
    value: "gpt-oss",
    model: "gpt-4o-mini",
    provider: "openai",
  },
];

/** Get a model config by its value key. Throws if not found. */
export function getModelConfig(value: string): ModelConfig {
  const config = MODELS.find((m) => m.value === value);
  if (!config) {
    throw new Error(`Unknown model value: "${value}". Valid values: ${MODELS.map(m => m.value).join(", ")}`);
  }
  return config;
}

/** Default model value used when none is specified */
export const DEFAULT_MODEL = "gemini";
