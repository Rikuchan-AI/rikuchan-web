const BACKEND_URL = process.env.MC_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_MC_BACKEND_URL
  ?? "";

/**
 * Catch-all proxy to the MC backend.
 *
 * Solves Railway's Fastly CDN ERR_HTTP2_PROTOCOL_ERROR that kills
 * browser → Railway SSE connections. By proxying through Next.js,
 * the browser connects to the same origin (no CORS, no CDN buffering),
 * and this route connects server-side to the backend.
 *
 * Works both locally and in production on Railway.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Allow long-running SSE streams without Next.js killing the route
export const maxDuration = 300;

const SSE_CONNECT_TIMEOUT_MS = 15_000;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10 MB

// Allowed backend path prefixes — requests outside this list are rejected
const ALLOWED_PATH_PREFIXES = [
  "/api/projects",
  "/api/tasks",
  "/api/agents",
  "/api/sessions",
  "/api/groups",
  "/api/settings",
  "/api/events",
  "/api/gateway",
  "/api/audit",
  "/api/memory",
  "/api/notifications",
  "/api/heartbeat",
  "/api/activation",
  "/api/delegation",
  "/api/chat",
  "/api/agent",
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?"));
}

async function proxy(req: Request) {
  const url = new URL(req.url);
  const backendPath = url.pathname.replace(/^\/api\/mc\/proxy/, "");

  // Security: reject paths not in the allowlist
  if (!isAllowedPath(backendPath)) {
    return new Response(
      JSON.stringify({ error: "Forbidden path" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const target = `${BACKEND_URL}${backendPath}${url.search}`;

  const headers = new Headers();
  const ct = req.headers.get("Content-Type");
  if (ct) headers.set("Content-Type", ct);

  const authHeader = req.headers.get("Authorization");
  if (authHeader) headers.set("Authorization", authHeader);

  const isSSE = backendPath === "/api/events";

  let body: ArrayBuffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY_SIZE) {
      return new Response(
        JSON.stringify({ error: "Request body too large" }),
        { status: 413, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const ac = new AbortController();
  const timeout = setTimeout(
    () => ac.abort(new Error("upstream connect timeout")),
    isSSE ? SSE_CONNECT_TIMEOUT_MS : REQUEST_TIMEOUT_MS,
  );
  req.signal.addEventListener("abort", () => ac.abort(req.signal.reason), { once: true });

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      signal: ac.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    console.error(`[proxy] ${backendPath} failed:`, err);
    return new Response(
      JSON.stringify({ error: "upstream unreachable" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
  clearTimeout(timeout);

  if (isSSE) {
    const upstreamContentType = upstream.headers.get("Content-Type") ?? "";
    if (!upstream.ok || !upstreamContentType.includes("text/event-stream")) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstreamContentType || "application/json",
          "Cache-Control": upstream.headers.get("Cache-Control") ?? "no-cache, no-transform",
        },
      });
    }

    // Pipe upstream through a TransformStream so stream errors close
    // gracefully instead of crashing the route handler with a 500.
    const { readable, writable } = new TransformStream();
    const pump = async () => {
      try {
        if (upstream.body) {
          await upstream.body.pipeTo(writable, { signal: req.signal });
        } else {
          writable.close();
        }
      } catch {
        // Client disconnected or upstream dropped — expected for SSE
        try { writable.close(); } catch { /* already closed by pipeTo */ }
      }
    };
    pump().catch(() => {});

    return new Response(readable, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
