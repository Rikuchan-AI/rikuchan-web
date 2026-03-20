import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";

type OpenClawModel = {
  id: string;
  name?: string;
  contextWindow?: number;
  maxTokens?: number;
  cost?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
};

type OpenClawConfig = {
  models?: {
    providers?: Record<string, { models?: OpenClawModel[] }>;
  };
  agents?: {
    defaults?: {
      models?: Record<string, { alias?: string }>;
    };
  };
};

function resolveOpenClawConfigPath() {
  return process.env.OPENCLAW_CONFIG_PATH ?? path.join(/*turbopackIgnore: true*/ os.homedir(), ".openclaw", "openclaw.json");
}

export async function GET() {
  const configPath = resolveOpenClawConfigPath();

  try {
    const raw = await fs.readFile(configPath, "utf8");
    const config = JSON.parse(raw) as OpenClawConfig;
    const providerEntries = Object.entries(config.models?.providers ?? {});
    const allowlistedRefs = Object.keys(config.agents?.defaults?.models ?? {});

    const freeModels = providerEntries.flatMap(([provider, providerConfig]) =>
      (providerConfig.models ?? [])
        .filter((model) => model.cost?.input === 0 && model.cost?.output === 0)
        .map((model) => ({
          provider,
          ref: `${provider}/${model.id}`,
          id: model.id,
          name: model.name ?? model.id,
          contextWindow: model.contextWindow,
          maxTokens: model.maxTokens,
          cost: model.cost ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          allowlisted: allowlistedRefs.includes(`${provider}/${model.id}`),
        }))
    );

    return NextResponse.json({
      configPath,
      freeModels,
      allowlistedRefs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to load OpenClaw free models: ${String(error)}`,
        configPath,
        freeModels: [],
        allowlistedRefs: [],
      },
      { status: 500 }
    );
  }
}
