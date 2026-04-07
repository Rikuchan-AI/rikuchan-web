const API_URL = process.env.RIKUCHAN_API_URL ?? "";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_BODY_SIZE = 10 * 1024 * 1024;

const ALLOWED_PATH_PREFIXES = [
  "/api/corpus",
  "/api/knowledge-profile",
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?"),
  );
}

async function proxy(req: Request) {
  if (!API_URL) {
    return new Response(
      JSON.stringify({ error: "rikuchan-api not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = new URL(req.url);
  const backendPath = url.pathname.replace(/^\/api\/rikuchan-api\/proxy/, "");

  if (!isAllowedPath(backendPath)) {
    return new Response(
      JSON.stringify({ error: "Forbidden path" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const target = `${API_URL}${backendPath}${url.search}`;

  const headers = new Headers();
  const ct = req.headers.get("Content-Type");
  if (ct) headers.set("Content-Type", ct);
  const authHeader = req.headers.get("Authorization");
  if (authHeader) headers.set("Authorization", authHeader);

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
  const timeout = setTimeout(() => ac.abort(new Error("upstream timeout")), REQUEST_TIMEOUT_MS);
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
    console.error(`[rikuchan-api proxy] ${backendPath} failed:`, err);
    return new Response(
      JSON.stringify({ error: "upstream unreachable" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
  clearTimeout(timeout);

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
