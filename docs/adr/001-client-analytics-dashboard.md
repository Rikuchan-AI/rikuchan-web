# ADR 001 — Client Analytics Dashboard: Architecture & Data Strategy

- **Status**: Accepted
- **Date**: 2026-03-20
- **Authors**: William Komori, Claude (co-authored)
- **Deciders**: William Komori

## Context

The Rikuchan gateway already tracks every API request in two stores:

1. **SQLite `request_log`** — local, fast, 19 columns. Used by `aggregator.py` to produce global `daily_metrics`. Does NOT have `user_id`.
2. **Supabase `gateway_requests`** — cloud, 23 columns including `user_id`. Fire-and-forget writes via `store.py:_write_supabase()`.

The existing **monitor-dashboard** (`rikuchan-monitor-dashboard`) is an internal tool that shows global metrics across all tenants. It reads directly from Supabase using `NEXT_PUBLIC_SUPABASE_ANON_KEY` with no RLS — every query returns data from all users.

Paying customers (Starter/Team/Scale plans) need their own dashboard to answer: **"Is it worth paying for Rikuchan?"** This requires:
- Tenant-isolated data (each user sees only their own requests)
- Real savings formulas (not the hardcoded `*0.55/*0.25/*0.12/*0.08` breakdown)
- ROI based on actual plan price (not the fake `totalCost * 0.05`)
- Honest confidence classification for each metric

### Problems identified

| Problem | Impact |
|---------|--------|
| SQLite `request_log` has no `user_id` | Cannot aggregate per-tenant from local store |
| `daily_metrics` is global (no `user_id`) | Cannot use for client dashboard |
| No RLS on `gateway_requests` | Any query returns all tenants' data |
| `_write_supabase` uses `publishable_key` | With RLS enabled, inserts would fail |
| Savings breakdown is hardcoded percentages | Client sees fake data |
| ROI formula uses fictitious 5% overhead | Misleading value |
| `tokens_trimmed` not persisted to DB | Cannot show context optimization savings |
| No Clerk JWT integration with Supabase | Cannot use RLS for tenant isolation |

## Decision

### 1. Per-tenant aggregation: Strategy A (direct queries)

**Query `gateway_requests` directly** for the client dashboard using composite index `(user_id, created_at DESC)`.

Do NOT create a per-user `daily_metrics` table. The global `daily_metrics` continues to serve the internal monitor-dashboard unchanged.

### 2. API endpoints: Gateway, not rikuchan-web

New analytics endpoints live in the gateway (`src/api/analytics.py`), not as Next.js API routes in rikuchan-web.

Rationale:
- rikuchan-web already calls the gateway via `lib/gateway.ts` with Clerk JWT — established pattern
- Gateway has `clerk_auth.py` for JWT verification
- Gateway has `ProviderRegistry` needed for routing savings computation
- rikuchan-web has zero Supabase dependencies — adding one would be a new architectural pattern

### 3. Real savings formulas with confidence badges

Replace fake breakdown with three measured/calculated vectors:
- **Cache savings** (Measured): `SUM(cost_without_gateway_usd) WHERE cache_hit = true`
- **Routing savings** (Calculated): `estimate_cost(original_model) - cost_usd WHERE model_override_applied`
- **Context trimming** (Measured): `(tokens_trimmed / 1M) * input_price` (requires new tracking)

RAG is NOT a savings vector — it increases input cost. Show as usage metric only.

### 4. ROI formula

```
ROI = total_savings_period / plan_price_period
```

Plan price from Clerk Billing integration. Free plan: show savings amount without ROI ratio.

### 5. Tier pricing: Clerk Billing integration

Integrate with Clerk Billing for plan prices instead of hardcoding.

### 6. Bilingual i18n from day one

Simple `Record<locale, Record<key, string>>` approach for PT-BR/EN. No framework overhead.

### 7. RLS + Clerk JWT: new Supabase setup

Configure Clerk JWT template in Supabase project settings. Switch `_write_supabase` to `service_role_key`.

## Alternatives Considered

### Strategy B: Per-user `daily_metrics` table

Create `user_daily_metrics` with same schema + `user_id`, aggregated by a modified `aggregator.py`.

**Rejected because**:
- Requires new aggregation job running daily (more infra complexity)
- Introduces 24h staleness (aggregation runs at 00:05 UTC)
- Direct queries on indexed `gateway_requests` are fast enough for individual tenant volumes
- Would need to aggregate from Supabase (not SQLite) since SQLite lacks `user_id`

### Strategy C: Materialized views

Create a Supabase materialized view `user_daily_summary` refreshed periodically.

**Rejected because**:
- Supabase materialized views require manual refresh or pg_cron
- Adds operational complexity for marginal performance gain
- Can be added later as optimization if needed (non-breaking)

### Endpoints in rikuchan-web API routes

Create Next.js API routes that query Supabase directly with Clerk JWT.

**Rejected because**:
- Would add `@supabase/supabase-js` as new dependency to rikuchan-web
- Gateway already has Supabase REST helpers and `ProviderRegistry` for pricing
- Would bypass the established `gatewayFetch()` pattern
- Routing savings computation requires Python-side pricing lookup

## Consequences

### Positive
- Client dashboard shows real, auditable savings data
- Each metric has explicit confidence classification (Measured/Calculated/Estimated)
- Tenant isolation prevents data leakage between customers
- Follows existing architectural patterns in both repos

### Negative
- Direct `gateway_requests` queries may slow down for high-volume tenants (>500k rows/month)
- Mitigation: add materialized view as Strategy C optimization later
- RLS setup requires Clerk JWT template configuration in Supabase (one-time manual setup)

### Risks
- `providers.yaml` pricing may become stale — routing savings depend on accurate pricing
- Mitigation: periodic validation against provider pricing pages; flag stale pricing in admin dashboard
