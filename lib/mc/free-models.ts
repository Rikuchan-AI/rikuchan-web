"use client";

export type FreeModelEntry = {
  provider: string;
  ref: string;
  id: string;
  name: string;
  contextWindow?: number;
  maxTokens?: number;
  allowlisted: boolean;
  cost: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
};

export type FreeModelsResponse = {
  freeModels: FreeModelEntry[];
  allowlistedRefs: string[];
  configPath?: string;
  error?: string;
};
