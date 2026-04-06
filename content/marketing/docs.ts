export type DocSection = {
  id: string;
  title: string;
  description?: string;
  items: DocItem[];
};

export type DocItem = {
  title: string;
  body: string;
  code?: string;
  codeTitle?: string;
};

export const docsNav = [
  { id: "overview", label: "Overview" },
  { id: "gateway", label: "Gateway" },
  { id: "rag", label: "RAG Engine" },
  { id: "agents", label: "Agents & OpenClaw" },
  { id: "configuration", label: "Configuration" },
  { id: "fine-tuning", label: "Fine-tuning" },
  { id: "optimizations", label: "Optimizations" },
  { id: "use-cases", label: "Use Cases" },
  { id: "api-reference", label: "API Reference" },
] as const;

export const docsSections: DocSection[] = [
  // ─── Overview ─────────────────────────────────────────────
  {
    id: "overview",
    title: "Overview",
    description:
      "Rikuchan is an AI infrastructure stack: a transparent gateway proxy, a hybrid RAG engine, and an agent runtime — all designed to work together. One env var change gives any AI tool access to your personal knowledge base.",
    items: [
      {
        title: "Architecture",
        body: "The stack consists of three layers that can run together or independently:\n\n• **Gateway** (port 4000) — HTTP proxy between AI clients and providers. Intercepts requests, enriches with RAG context, routes to the right model.\n• **RAG Engine** (embedded in agent) — Hybrid vector + BM25 search with BGE reranking. Stores knowledge in LanceDB locally.\n• **Agent Runtime** (port 3020 API, port 8765 MCP) — Orchestrates embeddings, ingestion, search, and exposes tools via MCP to any compatible client.",
      },
      {
        title: "Design principles",
        body: "1. **Zero LLM calls in the gateway** — only retrieval + context injection. The single LLM call happens at the provider.\n2. **Fail-open** — if RAG fails or times out, the request proceeds without context (pass-through).\n3. **Streaming-first** — SSE pass-through with zero response buffering.\n4. **Config over code** — behavior controlled via YAML and environment variables.\n5. **Local-first** — all embeddings, search, and storage run locally via Ollama + LanceDB.",
      },
      {
        title: "Quick start",
        body: "Install the rikuchan CLI, run the setup wizard, and point your AI client to the gateway.",
        code: `# Install rikuchan
curl -fsSL https://openclaw.ai/install.sh | bash

# Run the onboard wizard
rikuchan onboard

# Point Claude Code to the gateway
export ANTHROPIC_BASE_URL=http://localhost:4000/v1
export ANTHROPIC_API_KEY=rk_live_your_token

# That's it — Claude Code now has your knowledge
claude "explain the auth architecture"`,
        codeTitle: "terminal",
      },
    ],
  },

  // ─── Gateway ──────────────────────────────────────────────
  {
    id: "gateway",
    title: "AI Gateway",
    description:
      "The gateway is a transparent HTTP proxy that sits between AI clients (Claude Code, Cursor, Codex, ChatGPT, etc.) and providers (Anthropic, OpenAI, Google). Clients don't know the proxy exists.",
    items: [
      {
        title: "How it works",
        body: "Every request flows through 5 stages:\n\n1. **Intent Classification** — lightweight heuristic decides if the query benefits from RAG context (no LLM call).\n2. **RAG Bridge** — if needed, queries the RAG engine with a 200ms timeout. On timeout or error, skips silently.\n3. **Context Injection** — injects high-scoring chunks into the system prompt as `<context>` XML blocks.\n4. **Provider Routing** — detects the model from the request, maps to the right provider, swaps the local `rk_*` key for the real API key.\n5. **SSE Streaming** — streams the response back to the client without buffering.",
      },
      {
        title: "Provider detection",
        body: "The gateway auto-detects the provider from the request path and model name:\n\n• `/v1/messages` + `claude-*` → Anthropic\n• `/v1/chat/completions` + `gpt-*` → OpenAI\n• `/v1/chat/completions` + `gemini-*` → Google\n• Header `x-rikuchan-provider` overrides auto-detection.",
      },
      {
        title: "Client configuration",
        body: "Point any OpenAI-compatible or Anthropic-compatible client to the gateway. A single env var change is all you need.",
        code: `# Claude Code / Claude Desktop
ANTHROPIC_BASE_URL=http://localhost:4000/v1

# Cursor / Continue / Codex / ChatGPT API
OPENAI_BASE_URL=http://localhost:4000/v1

# All clients use a gateway-bound key
ANTHROPIC_API_KEY=rk_live_your_token
OPENAI_API_KEY=rk_live_your_token`,
        codeTitle: "env vars",
      },
      {
        title: "Key swap & security",
        body: "Clients authenticate with `rk_*` tokens bound to their user/workspace. The gateway resolves the user, looks up the real provider API key from encrypted storage, and swaps it before forwarding. **Real API keys never leave the gateway.**",
      },
    ],
  },

  // ─── RAG Engine ───────────────────────────────────────────
  {
    id: "rag",
    title: "RAG Engine",
    description:
      "The RAG engine provides hybrid search (vector + BM25) with BGE reranking. It runs embedded in the rikuchan-agent runtime, storing all data locally in LanceDB.",
    items: [
      {
        title: "Hybrid search pipeline",
        body: "Every search query goes through:\n\n1. **Embedding** — `multilingual-e5-base` via TEI (768 dimensions)\n2. **Vector search** — cosine similarity in Supabase pgvector\n3. **BM25 search** — lexical keyword matching\n4. **RRF merge** — Reciprocal Rank Fusion combines both result sets\n5. **BGE reranking** — `bge-reranker-base` re-scores the merged results for final relevance",
      },
      {
        title: "Score interpretation",
        body: "After BGE reranking, scores indicate confidence:\n\n• **> 2.0** — High confidence. Injected as trusted context.\n• **0.5 – 2.0** — Moderate. Injected as supplementary context.\n• **< 0.5** — Low confidence. Discarded, not injected.\n• **0 results** — Gateway proceeds without context (pass-through).",
      },
      {
        title: "Collections & filters",
        body: "Documents are organized into collections and can be filtered by project and entity:\n\n• **Collections**: `conversations`, `code`, `context`, `documents`\n• **Projects**: `cvc-mobile`, `aurali-care`, `glober`, `openclaw`, `rikuchan-rag`\n• **Entities**: `william`, `cvc`, `aurali`, `glober`",
      },
      {
        title: "Ingestion",
        body: "The rikuchan CLI handles ingestion with adaptive chunking per content type, SHA-256 deduplication, and automatic collection classification.",
        code: `# Ingest a file
rikuchan ingest /path/to/document.md

# Ingest a directory recursively
rikuchan ingest /path/to/project/ --project cvc-mobile

# Force re-index (skip dedup check)
rikuchan ingest /path/to/file.md --force

# Watch a directory for changes
rikuchan watch /path/to/docs/`,
        codeTitle: "terminal",
      },
      {
        title: "MCP integration",
        body: "The RAG is exposed to AI clients via MCP (Model Context Protocol). Claude Code, Cline, Cursor, and OpenClaw can call `rag_search` directly as a tool.\n\nThe MCP server runs on `http://127.0.0.1:8765/sse` and supports SSE transport.",
        code: `// Claude Code settings.json
{
  "mcpServers": {
    "rikuchan-rag": {
      "type": "sse",
      "url": "http://127.0.0.1:8765/sse"
    }
  }
}`,
        codeTitle: "settings.json",
      },
    ],
  },

  // ─── Agents & OpenClaw ────────────────────────────────────
  {
    id: "agents",
    title: "Agents & OpenClaw",
    description:
      "Rikuchan integrates with OpenClaw as an agent runtime, enabling multi-agent workflows where each agent has access to the shared knowledge base via memory_search.",
    items: [
      {
        title: "Agent architecture",
        body: "OpenClaw runs a hierarchy of specialized agents, each with defined roles, tools, and model assignments:\n\n• **Engineering Manager** — coordinates tech-lead, devs, PMs, QA\n• **Tech Lead** — reviews architecture, delegates implementation\n• **Dev Staff** (mobile/backend) — writes code, uses git, memory_search\n• **Product Manager** — writes specs, coordinates research\n• **QA Engineer** — validates implementations\n• **Researcher** — web search, browser, information gathering\n• **AI Engineer** — RAG pipelines, vector databases, ML systems\n\nAll agents share the same knowledge base through `memory_search`.",
      },
      {
        title: "Memory search in agents",
        body: "Every agent with `memory_search` in its tool list can semantically search the shared knowledge base. The provider is TEI with `multilingual-e5-base`.\n\nMemory sources include `MEMORY.md`, `memory/*.md` files, and session transcripts.",
        code: `// openclaw.json — agent defaults
{
  "memorySearch": {
    "enabled": true,
    "provider": "tei",
    "model": "multilingual-e5-base",
    "sources": ["memory", "sessions"],
    "query": {
      "maxResults": 8,
      "minScore": 0.3,
      "hybrid": {
        "enabled": true,
        "vectorWeight": 0.7,
        "textWeight": 0.3
      }
    }
  }
}`,
        codeTitle: "openclaw.json",
      },
      {
        title: "Mission Control",
        body: "The rikuchan-monitor-dashboard provides a real-time view of the agent runtime:\n\n• System status (Ollama, API, MCP, chunk count, BM25 index)\n• Provider health (Anthropic, OpenAI, ZAI status)\n• Agent heartbeats and session tracking\n• Live logs with structured output\n\nAccess at `http://localhost:3020` when the rikuchan agent is running.",
      },
      {
        title: "Agent-to-agent communication",
        body: "Agents can spawn sub-agents, send messages between sessions, and coordinate via the `sessions_spawn`, `sessions_send`, and `sessions_list` tools. The lead agent delegates to specialists who report back.",
      },
    ],
  },

  // ─── Configuration ────────────────────────────────────────
  {
    id: "configuration",
    title: "Configuration",
    description:
      "Rikuchan uses a layered configuration system: environment variables → .env files → YAML config → runtime defaults.",
    items: [
      {
        title: "Gateway configuration",
        body: "The gateway is configured via environment variables with the `RIKUCHAN_` prefix. All settings have sensible defaults.",
        code: `# Gateway
RIKUCHAN_GATEWAY_HOST=127.0.0.1
RIKUCHAN_GATEWAY_PORT=4000

# RAG connection
RIKUCHAN_RAG_URL=http://localhost:8000
RIKUCHAN_RAG_TOKEN=your_token_here
RIKUCHAN_RAG_TIMEOUT_MS=200
RIKUCHAN_RAG_ENABLED=true
RIKUCHAN_RAG_MIN_SCORE=0.5

# Provider API keys
RIKUCHAN_ANTHROPIC_BASE_URL=https://api.anthropic.com
RIKUCHAN_OPENAI_BASE_URL=https://api.openai.com

# Supabase (identity + sync)
RIKUCHAN_SUPABASE_ENABLED=true
RIKUCHAN_SUPABASE_URL=https://your-project.supabase.co

# Logging
RIKUCHAN_LOG_LEVEL=INFO`,
        codeTitle: ".env",
      },
      {
        title: "Agent configuration (OpenClaw)",
        body: "Agent behavior is controlled via `~/.openclaw/openclaw.json`. Key sections:\n\n• `models.providers` — provider endpoints and model definitions\n• `agents.defaults` — default model, memory search, subagent limits\n• `agents.list` — per-agent overrides (model, workspace, tools, subagents)\n• `gateway` — local gateway port, auth, and control UI settings",
      },
      {
        title: "MCP server setup",
        body: "The rikuchan agent exposes an MCP server via SSE on port 8765. Configure it in your AI client:",
        code: `# Claude Code (~/.claude/settings.json)
{
  "mcpServers": {
    "rikuchan-rag": {
      "type": "sse",
      "url": "http://127.0.0.1:8765/sse"
    }
  }
}

# Cline (cline_mcp_settings.json)
{
  "mcpServers": {
    "rikuchan-rag": {
      "type": "sse",
      "url": "http://127.0.0.1:8765/sse"
    }
  }
}`,
        codeTitle: "MCP config",
      },
      {
        title: "Hooks (Claude Code)",
        body: "Claude Code hooks enable automatic RAG enforcement:\n\n• **UserPromptSubmit** — injects a reminder to call `rag_search` before answering project-specific questions\n• **PreCompact** — saves conversation context before compaction\n• **Stop** — reminder to save learnings from the session",
      },
    ],
  },

  // ─── Fine-tuning ──────────────────────────────────────────
  {
    id: "fine-tuning",
    title: "Fine-tuning",
    description:
      "Rikuchan supports fine-tuning local models for improved retrieval and response quality within specific domains.",
    items: [
      {
        title: "Embedding model fine-tuning",
        body: "The default embedding model (`multilingual-e5-base`) can be fine-tuned on domain-specific data to improve retrieval accuracy. The process:\n\n1. **Export training pairs** — use the RAG feedback loop to extract positive/negative query-document pairs\n2. **Fine-tune** — train a custom embedding model using sentence-transformers\n3. **Deploy** — serve the fine-tuned model via TEI\n4. **Re-embed** — re-index the knowledge base with the new model",
      },
      {
        title: "Reranker tuning",
        body: "The BGE reranker (`bge-reranker-base`) can be improved with domain-specific relevance judgments:\n\n• Collect query-passage pairs with human relevance scores\n• Fine-tune using cross-encoder training\n• Deploy locally via Ollama or as a custom endpoint\n• Update the gateway config to point to the new reranker",
      },
      {
        title: "Chunking strategies",
        body: "Different content types benefit from different chunking approaches:\n\n• **Code** — function/class-level chunks with import context preserved\n• **Markdown/docs** — header-aware chunking respecting document structure\n• **Conversations** — message-boundary chunking with metadata preservation\n• **Default** — 400 tokens with 80 token overlap\n\nChunking parameters are configurable per collection.",
      },
    ],
  },

  // ─── Optimizations ────────────────────────────────────────
  {
    id: "optimizations",
    title: "Optimizations",
    description:
      "Performance optimizations at every layer of the stack, from embedding caching to context window management.",
    items: [
      {
        title: "Gateway latency",
        body: "Target: < 50ms added latency per request.\n\n• **RAG timeout** — hard cap at 200ms. If exceeded, skip RAG and pass-through.\n• **Connection pooling** — httpx async client with keep-alive connections to providers.\n• **Streaming** — zero-copy SSE pass-through, no response buffering.\n• **Intent classifier** — skip RAG entirely for queries that don't benefit (refactoring, CLI commands, greetings).",
      },
      {
        title: "Context window management",
        body: "The gateway respects token budgets per model:\n\n• Reserves 30% of context window for the response\n• Hard cap of 4000 tokens for RAG context injection\n• Truncates lower-scoring chunks first when over budget\n• Uses tiktoken for accurate token counting",
      },
      {
        title: "Semantic cache",
        body: "Embedding-based cache for RAG queries:\n\n• Hash the query embedding → cosine similarity check against cache\n• If similarity > 0.95, return cached results (skip full search pipeline)\n• SQLite-backed with TTL-based eviction\n• Reduces repeated query latency from ~150ms to ~5ms",
      },
      {
        title: "BM25 index optimization",
        body: "The BM25 index is built in-memory from LanceDB chunks:\n\n• Rebuilt on ingestion events (incremental)\n• Invalidated when documents are deleted\n• Uses pre-tokenized terms for faster matching\n• Combined with vector results via RRF before reranking",
      },
      {
        title: "Embedding batch processing",
        body: "Bulk ingestion optimizations:\n\n• Batch embeddings through Ollama (reduces per-call overhead)\n• SHA-256 deduplication skips already-indexed content\n• Parallel chunk processing with configurable concurrency\n• Progress tracking via CLI output",
      },
    ],
  },

  // ─── Use Cases ────────────────────────────────────────────
  {
    id: "use-cases",
    title: "Use Cases",
    description:
      "Real-world scenarios where the Rikuchan stack adds value — from individual developers to multi-agent teams.",
    items: [
      {
        title: "Claude Code + personal knowledge",
        body: "Point Claude Code at the gateway. Every prompt automatically gets enriched with relevant context from your project decisions, architecture docs, and past conversations.\n\n**Before**: You repeat context every session. Claude gives generic answers.\n**After**: Claude knows your patterns, decisions, and conventions. Answers are grounded in your actual project.",
        code: `# Setup (one-time)
export ANTHROPIC_BASE_URL=http://localhost:4000/v1
export ANTHROPIC_API_KEY=rk_live_token

# Now Claude Code knows your projects
claude "how does our auth middleware work?"
# → Answers grounded in YOUR architecture, not generic patterns`,
        codeTitle: "terminal",
      },
      {
        title: "OpenClaw multi-agent workflows",
        body: "Run a team of specialized agents that share the same knowledge base:\n\n• **Engineering Manager** reviews a ticket and delegates to Tech Lead\n• **Tech Lead** searches memory for relevant architecture decisions, then spawns Dev agents\n• **Dev Staff** writes code informed by project conventions from memory_search\n• **QA Engineer** validates against patterns found in the knowledge base\n\nAll agents see the same decisions, patterns, and context — no information silos.",
      },
      {
        title: "Mission Control monitoring",
        body: "The monitor dashboard provides real-time visibility:\n\n• Track which agents are alive, degraded, or offline\n• Monitor RAG query latency and hit rates\n• View provider status (API key validity, rate limits)\n• Watch chunk counts grow as knowledge base expands\n• Tail structured logs for debugging",
      },
      {
        title: "Multi-client routing",
        body: "Use different AI clients for different tasks, all through the same gateway:\n\n• **Claude Code** for coding tasks (Anthropic provider)\n• **Cursor** for IDE-integrated editing (OpenAI provider)\n• **Codex** for autonomous tasks (OpenAI Codex provider)\n• **ChatGPT Desktop** for general queries (OpenAI provider)\n\nAll clients share the same RAG context and provider credentials. One `rk_*` key per user, the gateway handles the rest.",
      },
      {
        title: "Team knowledge onboarding",
        body: "Onboard new team members by giving their AI tools access to the team's accumulated knowledge:\n\n1. Ingest project docs, ADRs, runbooks into the knowledge base\n2. Set up the gateway with the team's provider credentials\n3. New member points their AI client to the gateway\n4. Their first Claude Code session already knows the codebase, conventions, and past decisions",
      },
      {
        title: "Cost optimization",
        body: "The gateway tracks and optimizes AI spend:\n\n• **Model routing** — match request complexity to model capability (Haiku for simple queries, Opus for complex reasoning)\n• **Context pruning** — only inject relevant context, reducing prompt bloat by ~37%\n• **Usage visibility** — track cost per user, per model, per project in the dashboard\n• **Cache hits** — semantic cache eliminates redundant RAG queries",
      },
    ],
  },

  // ─── API Reference ────────────────────────────────────────
  {
    id: "api-reference",
    title: "API Reference",
    description:
      "The rikuchan-agent exposes a REST API on port 3020 and an MCP server on port 8765.",
    items: [
      {
        title: "MCP tools",
        body: "Available via MCP SSE at `http://127.0.0.1:8765/sse`:",
        code: `rag_search(
  question: string,      // Search query (3-8 words best)
  project?: string,       // Filter: "cvc-mobile", "aurali-care"...
  collection?: string,    // Filter: "conversations" | "code" | "context" | "documents"
  n_results?: number,     // Default: 20 (pre-reranking candidates)
  use_rerank?: boolean,   // Default: true
  use_bm25?: boolean      // Default: true
) → { chunks, latency_ms }`,
        codeTitle: "rag_search",
      },
      {
        title: "REST API endpoints",
        body: "Available on `http://127.0.0.1:3020`:",
        code: `GET  /health              # Health check + system stats
POST /query               # Hybrid search + reranking
POST /ingest              # Index file or directory
POST /feedback            # Query feedback (accepted/rejected)
GET  /analytics           # Usage metrics
GET  /audit               # Query audit log
DELETE /document          # Remove document by hash`,
        codeTitle: "endpoints",
      },
      {
        title: "Gateway proxy endpoints",
        body: "Available on `http://127.0.0.1:4000`. The gateway proxies any path to the detected provider:",
        code: `# Anthropic (auto-detected by path + model)
POST /v1/messages
  → Proxied to api.anthropic.com/v1/messages

# OpenAI (auto-detected by path + model)
POST /v1/chat/completions
  → Proxied to api.openai.com/v1/chat/completions

# Health check
GET /health
  → Gateway status + RAG connectivity`,
        codeTitle: "gateway routes",
      },
    ],
  },
];
