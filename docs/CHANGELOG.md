# Changelog

## 2026-03-22

### Multi-Tenancy + Back Office (ADR-005)

Full multi-tenant transformation. See [ADR-005](adr/005-multi-tenancy-clerk-organizations-supabase-rls.md)
for architecture decisions and [MULTI_TENANCY.md](MULTI_TENANCY.md) for technical reference.

**7 Supabase migrations applied:**
1. `add_tenant_id_to_mc_tables` — tenant_id on 9 mc_* tables
2. `create_platform_tables` — tenants, tenant_plans, tenant_gateways, feature_flags, tenant_usage, backoffice_audit
3. `create_app_tenant_id_function_and_rls_policies` — app_tenant_id() + RLS on all tables
4. `add_tenant_id_to_rag_tables` — tenant_id on rag_chunks, collections, rag_requests, rag_ingest_requests
5. `update_match_chunks_to_use_tenant_id` — CTE-level filtering for vector search performance
6. `add_tenant_id_to_gateway_tables` — tenant_id on api_keys, provider_credentials, gateway_requests, etc.

**~20 TypeScript files created/modified, ~5 Python files modified across 3 repos.**

---

## 2026-03-20

### UI/UX — Mission Control Dashboard Fixes (ADR-003)

- **ProjectCard** — Remove `workspacePath` display; internal file system path is not user-facing info
- **ProjectCard** — Add `blocked` pill (BLK) in red when `taskCount.blocked > 0`; `taskCount` type extended with optional `blocked?: number`
- **DashboardShell** — Remove "Invite teammate" button (linked to `/signup`, no invite flow exists)
- **BoardHeader** — Add `title` tooltips to mode toggle: Manual / Supervised / Autonomous with one-line description each
- **DashboardSidebar** — Simplify workspace card from full `p-4` block with description to single inline status pill (`● Rikuchan Starter`); saves ~80px vertical space

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

- **Model Selector Loading State**
  - Shows RikuLoader (animated mascot spinner) while models are being fetched
  - Falls back to static model name if fetch fails

- **Model Fallback Display**
  - Assistant label shows requested model, with `->` arrow to actual model on fallback
  - Example: `glm-4.7 -> glm-4.7-flash`

- **Dedicated Groups Page** (`/agents/groups`)
  - Full CRUD: create, edit (inline), delete groups
  - GroupCard with project count, agent badge, gateway URL link
  - Saved gateway reuse: datalist dropdown + quick-select chips for existing gateway URLs
  - Auto-creates agent in OpenClaw gateway on group creation
  - "Groups" added to MC sidebar between Projects and Chat

- **Groups-First Project Flow**
  - Removed group creation form from Projects page (groups managed exclusively on Groups page)
  - "New Project" requires at least one group to exist
  - When no groups: shows "Create a Group first" with link to `/agents/groups`

- **New Task Button** (Board)
  - "New Task" button on project board with inline form
  - Title, description, priority selector (low/medium/high/critical)
  - Creates task in backlog status

### Bug Fixes (Web)

- **Sidebar highlight** — "Agents" link no longer highlights on all MC sub-routes (`/agents/projects`, `/agents/chat`, etc.)
- **RPC response handling** — All gateway WebSocket RPC calls now register IDs with `externalRpcResponseIds` to prevent "Unmatched RPC response" errors

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
