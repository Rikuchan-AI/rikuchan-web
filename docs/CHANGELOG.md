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
