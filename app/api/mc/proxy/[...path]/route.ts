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
async function proxy(req: Request) {
  const url = new URL(req.url);
  const backendPath = url.pathname.replace(/^\/api\/mc\/proxy/, "");
  const target = `${BACKEND_URL}${backendPath}${url.search}`;

  const headers = new Headers();
  const ct = req.headers.get("Content-Type");
  if (ct) headers.set("Content-Type", ct);

  // Forward the Authorization header from the original request
  const authHeader = req.headers.get("Authorization");
  if (authHeader) headers.set("Authorization", authHeader);

  const isSSE = backendPath === "/api/events";

  console.log(`[proxy] ${req.method} ${backendPath} → ${target}`);

  const body = req.method !== "GET" && req.method !== "HEAD"
    ? await req.arrayBuffer()
    : undefined;

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
    signal: req.signal,
  });

  if (isSSE) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
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
