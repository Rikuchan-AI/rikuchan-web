import type { ModelGroup, ModelOption } from "./types";

/** Fallback model list when gateway models.list is not available */
export const MODEL_GROUPS: ModelGroup[] = [
  {
    provider: "Anthropic",
    models: [
      { id: "claude-opus-4-6",   label: "Claude Opus 4.6",   inputCost: 15,   outputCost: 75   },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", inputCost: 3,    outputCost: 15,  recommended: true },
      { id: "claude-haiku-4-5",  label: "Claude Haiku 4.5",  inputCost: 0.25, outputCost: 1.25 },
    ],
  },
  {
    provider: "OpenAI",
    models: [
      { id: "gpt-4o",      label: "GPT-4o",       inputCost: 2.50, outputCost: 10   },
      { id: "gpt-4o-mini", label: "GPT-4o Mini",  inputCost: 0.15, outputCost: 0.60 },
    ],
  },
  {
    provider: "Google",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", inputCost: 0.10, outputCost: 0.40 },
      { id: "gemini-1.5-pro",   label: "Gemini 1.5 Pro",   inputCost: 1.25, outputCost: 5    },
    ],
  },
];

/** Convert models.list RPC response into ModelGroup[] */
export function gatewayModelsToGroups(
  models: Array<{
    id: string;
    name: string;
    provider: string;
    contextWindow?: number;
    reasoning?: boolean;
    cost?: {
      input?: number;
      output?: number;
      cacheRead?: number;
      cacheWrite?: number;
    };
    freeTier?: boolean;
  }>
): ModelGroup[] {
  const groups = new Map<string, ModelOption[]>();
  for (const m of models) {
    const provider = m.provider.charAt(0).toUpperCase() + m.provider.slice(1);
    if (!groups.has(provider)) groups.set(provider, []);
    groups.get(provider)!.push({
      id: m.id,
      label: m.name,
      provider,
      contextWindow: m.contextWindow,
      inputCost: m.cost?.input,
      outputCost: m.cost?.output,
      freeTier: m.freeTier ?? (m.cost != null && m.cost.input === 0 && m.cost.output === 0),
    });
  }
  return Array.from(groups.entries()).map(([provider, models]) => ({ provider, models }));
}

export const HEARTBEAT_FALLBACK_MODEL_OPTIONS: ModelOption[] = [
  {
    id: "gemini-2.0-flash-exp",
    label: "Gemini 2.0 Flash (Experimental)",
    provider: "Google",
    contextWindow: 1_000_000,
    rateLimit: "15 RPM / 1M TPD",
    recommended: true,
    note: "Melhor custo-benefício para heartbeat: contexto longo, zero custo",
    freeTier: true,
  },
  {
    id: "gemini-1.5-flash-8b",
    label: "Gemini 1.5 Flash-8B",
    provider: "Google",
    contextWindow: 1_000_000,
    rateLimit: "15 RPM / 1M TPD",
    note: "Mais leve que o Flash, bom para sub-agentes simples",
    freeTier: true,
  },
  {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B Instant (Groq)",
    provider: "Groq",
    contextWindow: 131_072,
    rateLimit: "30 RPM / 14,400 RPD",
    note: "Latência sub-segundo — ideal para heartbeat de alta frequência",
    freeTier: true,
  },
  {
    id: "gemma2-9b-it",
    label: "Gemma 2 9B (Groq)",
    provider: "Groq",
    contextWindow: 8_192,
    rateLimit: "30 RPM / 14,400 RPD",
    note: "Alternativa estável ao Llama no Groq",
    freeTier: true,
  },
  {
    id: "mistral-small-latest",
    label: "Mistral Small",
    provider: "Mistral",
    contextWindow: 32_000,
    rateLimit: "1 RPM (free tier)",
    note: "Baixo rate limit — só para heartbeat de baixa frequência (>60s)",
    freeTier: true,
  },
];

export const HEARTBEAT_PROVIDER_LABELS: Record<string, string> = {
  "gemini-2.0-flash-exp":  "Google",
  "gemini-1.5-flash-8b":   "Google",
  "llama-3.1-8b-instant":  "Groq",
  "gemma2-9b-it":          "Groq",
  "mistral-small-latest":  "Mistral",
};

const HEARTBEAT_FALLBACK_MODEL_MAP = new Map(HEARTBEAT_FALLBACK_MODEL_OPTIONS.map((model) => [model.id, model]));

function isFreeModelFromRpc(model: ModelOption): boolean {
  return model.inputCost === 0 && model.outputCost === 0;
}

function groupModelOptions(models: ModelOption[]): ModelGroup[] {
  const groups = new Map<string, ModelOption[]>();

  for (const model of models) {
    const provider = model.provider ?? HEARTBEAT_PROVIDER_LABELS[model.id] ?? "Other";
    if (!groups.has(provider)) groups.set(provider, []);
    groups.get(provider)!.push({ ...model, provider });
  }

  return Array.from(groups.entries()).map(([provider, providerModels]) => ({
    provider,
    models: providerModels,
  }));
}

export function getHeartbeatModelGroups(availableGroups: ModelGroup[]): ModelGroup[] {
  if (availableGroups.length === 0) {
    return groupModelOptions(HEARTBEAT_FALLBACK_MODEL_OPTIONS);
  }

  const models = availableGroups.flatMap((group) =>
    group.models
      .filter(isFreeModelFromRpc)
      .map((model) => {
        const metadata = HEARTBEAT_FALLBACK_MODEL_MAP.get(model.id);
        return {
          ...model,
          ...metadata,
          label: model.label || metadata?.label || model.id,
          provider: group.provider,
          contextWindow: model.contextWindow ?? metadata?.contextWindow,
          freeTier: true,
        };
      })
  );

  return groupModelOptions(models);
}

export function findModelProvider(modelId: string): string {
  for (const group of MODEL_GROUPS) {
    if (group.models.some((m) => m.id === modelId)) return group.provider;
  }
  return HEARTBEAT_PROVIDER_LABELS[modelId] ?? "Custom";
}

export function isPremiumModel(modelId: string): boolean {
  const premiumIds = ["claude-opus-4-6", "gpt-4o", "gemini-1.5-pro"];
  return premiumIds.includes(modelId);
}

export const HEARTBEAT_INTERVAL_OPTIONS = [
  { value: 10_000,  label: "10s" },
  { value: 30_000,  label: "30s" },
  { value: 60_000,  label: "1m" },
  { value: 120_000, label: "2m" },
  { value: 300_000, label: "5m" },
];

export const HEARTBEAT_TIMEOUT_OPTIONS = [
  { value: 3_000,  label: "3s" },
  { value: 5_000,  label: "5s" },
  { value: 10_000, label: "10s" },
  { value: 15_000, label: "15s" },
];
