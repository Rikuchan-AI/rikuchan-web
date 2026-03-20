# Changelog

## 2026-03-20

### New Features

- **Direct Gateway Chat** (`/agents/chat`)
  - Full conversation UI with message history persisted in localStorage
  - Sends messages via gateway `/v1/chat/completions` with Clerk JWT auth
  - Parses both OpenAI and Anthropic response formats (gateway translation)
  - Auto-generates conversation title from first message
  - Suggested prompts for empty conversations
  - Model selector per conversation (default: `glm-4.7-flash`)
  - Up to 50 conversations, 200 messages each

- **RAG Status Badges**
  - Each assistant message shows RAG usage: green `RAG N chunks` on hit, muted `RAG miss`/`RAG skipped` otherwise
  - Reads `x-rikuchan-rag`, `x-rikuchan-provider`, `x-rikuchan-model`, `x-rikuchan-latency-ms` headers
  - Shows actual model used (when fallback differs from requested)
  - Provider name and latency below timestamp

- **Copy Message Button**
  - Copy icon on hover for both user and assistant messages
  - Brief checkmark feedback after copying

- **Sidebar Reorder**
  - Mission Control section now appears before Platform
  - New "Chat" link added between Projects and Sessions

- **SSE Streaming Chat** (P0.2)
  - Tokens appear incrementally instead of waiting for full response
  - Blinking cursor while waiting for first token
  - Handles both OpenAI and Anthropic SSE formats
  - Perceived latency: 15-35s down to ~2s TTFB

- **Dynamic Model Selector**
  - Dropdown in chat header fetches available models from gateway `GET /v1/models`
  - Filters by user's configured provider credentials (`available: true`)
  - Grouped by provider, persisted per conversation
  - Shows fallback model when gateway reroutes: `glm-4.7 -> glm-4.7-flash`

- **Reasoning Content Filter**
  - Never shows `reasoning_content` (chain-of-thought) to user
  - Handles edge case where provider returns empty `content` with reasoning

### Performance (ADR-002)

- **Provider connection pooling** (gateway) — Singleton httpx pool (50/20 limits), eliminates TCP+TLS per request
- **pgvector HNSW query rewrite** (Supabase) — CTE forces index scan, 3500ms down to 234ms (15x)
- **Agent HTTP client pooling** — Supabase (20/10) and Ollama (10/5) singletons
- **BM25 non-blocking rebuild** — Searches not blocked during 5-min index refresh
- **Granular timing instrumentation** — Gateway: `auth_ms`, `body_parse_ms`, `rag_ms`, `route_ms`, `adapt_ms`, `connect_ms` in logs + `x-rikuchan-timing` header. Agent: `embed_ms`, `vector_ms`, `bm25_ms`, `rerank_ms`, `merge_ms` in `search_meta`

### Bug Fixes (Gateway — `rikuchan-ai-gateway`)

- **CORS `expose_headers`** — Added `x-rikuchan-*` response headers to CORS config so browsers can read RAG/provider metadata
- **Clerk publishable key mismatch** — Aligned gateway Railway env with web Clerk instance (`closing-goose-25`)
- **Clerk user_id drift** — Updated `clerk_user_id` in Supabase users table after Clerk dev mode ID change
- **Provider debug log spam** — Changed `resolve_provider_debug` from `info` to `debug` level
- **ANSI escape codes in Railway logs** — `ConsoleRenderer` now auto-detects TTY, disables colors in non-terminal
- **`x-client-id` header** — Web chat sends `rikuchan-web` as client identifier

### Bug Fixes (Agent — `rikuchan-agent`)

- **Vector search error logging** — Added HTTP status body and embedding dimensions to error logs
- **Vector search result logging** — Added row count and top similarity score to search results

### Bug Fixes (Supabase)

- **`match_chunks` duplicate overload (300 Multiple Choices)** — Dropped legacy function with `p_user_id uuid` signature; kept `p_user_id text`
- **`embedding_status` mismatch** — Function filtered `= 'completed'` but chunks had `'embedded'`; corrected to `'embedded'` (matching check constraint)
- **Missing `chunk_hash` in RETURNS** — Agent hybrid search pipeline requires `chunk_hash` for RRF merge; added to function output
- **PostgREST schema cache** — Forced reload via `NOTIFY pgrst, 'reload schema'` + DROP/CREATE to invalidate stale cache

### Infrastructure

- **Ollama embed model** — Changed Railway agent from `all-minilm` (384 dims) to `nomic-embed-text` (768 dims) to match existing chunk embeddings
