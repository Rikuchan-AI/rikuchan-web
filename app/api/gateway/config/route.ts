import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";

type OpenClawConfig = {
  gateway?: {
    port?: number;
    mode?: string;
    bind?: string;
    auth?: {
      mode?: string;
      token?: string;
    };
  };
};

function resolveConfigPath() {
  return process.env.OPENCLAW_CONFIG_PATH ?? path.join(os.homedir(), ".openclaw", "openclaw.json");
}

export async function GET() {
  const configPath = resolveConfigPath();

  try {
    const raw = await fs.readFile(configPath, "utf8");
    const config = JSON.parse(raw) as OpenClawConfig;
    const gw = config.gateway;

    if (!gw) {
      return NextResponse.json({ error: "No gateway config found" }, { status: 404 });
    }

    const port = gw.port ?? 18789;
    const host = gw.bind === "lan" ? "127.0.0.1" : "127.0.0.1";
    const url = `ws://${host}:${port}`;
    const token = gw.auth?.token ?? "";

    return NextResponse.json({ url, token, port, mode: gw.mode ?? "local" });
  } catch {
    // openclaw.json not available on this host — return empty config
    // Client will use saved credentials from localStorage instead
    return NextResponse.json({ url: "", token: "", port: 0, mode: "remote" });
  }
}
