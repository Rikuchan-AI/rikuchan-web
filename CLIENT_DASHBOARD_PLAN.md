# Client Analytics Dashboard — Consolidated Plan

> **Scope**: Dashboard for CLIENTS who pay the Rikuchan plan (Starter/Team/Scale).
> NOT the internal Rikuchan company dashboard (that's `rikuchan-monitor-dashboard`).
>
> **Related docs**:
> - [ADR 001 — Architecture & Data Strategy](docs/adr/001-client-analytics-dashboard.md)
> - [Calculation Model](docs/analytics-calculation-model.md)

---

## 1. Current State — Gap Map

### Data layer gaps

| Component | Has `user_id`? | Has RLS? | Current scope | Blocker? |
|-----------|:-:|:-:|---|:-:|
| SQLite `request_log` | No | N/A | Global | Yes |
| Supabase `gateway_requests` | Yes | No | Global (no isolation) | Yes |
| Supabase `daily_metrics` | No | No | Global | No (won't use for client dashboard) |
| `_write_supabase` auth key | N/A | N/A | Uses `publishable_key` | Yes (breaks with RLS) |

### Formula gaps

| Formula | Location | Status |
|---------|----------|--------|
| `cost_usd` | `logger.py:8-18` | Correct — keep |
| `cost_without_gateway_usd` | `handler.py:848` | Correct with documented premise — keep |
| Savings breakdown `*0.55/*0.25/*0.12/*0.08` | `monitor: savings/route.ts:65-70` | Fake — rewrite with real formulas |
| ROI `= savings / (totalCost * 0.05)` | `monitor: savings/route.ts:50-52` | Fake — rewrite as `savings / plan_price` |
| `tokens_trimmed` tracking | `context_trimmer.py:118` | Logged but not persisted — fix |

### Auth gaps

| Component | Status |
|-----------|--------|
| Clerk JWT in Supabase | Not configured (new setup needed) |
| RLS policies on `gateway_requests` | None exist |
| Clerk Billing integration for plan prices | Not implemented |

---

## 2. Architecture Decisions (see [ADR 001](docs/adr/001-client-analytics-dashboard.md))

- **Per-tenant aggregation**: Strategy A — direct queries on `gateway_requests` with composite index
- **Endpoints location**: Gateway (`src/api/analytics.py`), not rikuchan-web API routes
- **Savings model**: 3 measured/calculated vectors (cache, routing, trimming). RAG is NOT savings.
- **ROI**: `savings / plan_price` via Clerk Billing integration
- **i18n**: PT-BR/EN from day one with simple `Record<locale, Record<key, string>>`

---

## 3. Savings Model (see [Calculation Model](docs/analytics-calculation-model.md))

### Vectors

| Vector | Confidence | Formula summary |
|--------|------------|-----------------|
| Cache savings | 🟢 Measured | `SUM(cost_without_gateway_usd) WHERE cache_hit = true` |
| Routing savings | 🟡 Calculated | `estimate_cost(original_model) - cost_usd WHERE model_override_applied` |
| Trimming savings | 🟢 Measured | `(tokens_trimmed / 1M) * input_price` |
| RAG | N/A | Not a savings vector — show as usage metric only |

### ROI

```
ROI = total_savings / plan_price
```

Free plan: show savings amount, no ratio.

### Suppression

- < 100 requests → "Insufficient data"
- < 7 days → "Collecting data"
- Savings < $0.01 → hide breakdown
- 0 events for a vector → hide that card

---

## 4. SQL Migrations

### 4.1 SQLite (gateway)

```python
# store.py _MIGRATIONS
(7, "ALTER TABLE request_log ADD COLUMN user_id TEXT DEFAULT NULL;"),
```

### 4.2 Supabase

```sql
-- New column for context trimming
ALTER TABLE gateway_requests ADD COLUMN IF NOT EXISTS tokens_trimmed INTEGER DEFAULT 0;

-- Index for per-user queries
CREATE INDEX IF NOT EXISTS idx_gw_requests_user_created
ON gateway_requests (user_id, created_at DESC);

-- RLS
ALTER TABLE gateway_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_requests" ON gateway_requests
  FOR SELECT USING (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "service_insert" ON gateway_requests
  FOR INSERT WITH CHECK (true);
```

### 4.3 Clerk JWT Template (Supabase config)

Manual setup in Supabase dashboard:
1. Clerk dashboard → JWT Templates → create "supabase" template with `sub` = user_id
2. Supabase dashboard → Settings → Authentication → set JWT secret from Clerk JWKS

---

## 5. API Specification

### Endpoints (all require Clerk JWT, filtered by `user_id`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/analytics/summary?period=30d` | Hero metrics + ROI |
| GET | `/v1/analytics/timeline?period=30d` | Daily cost with/without gateway |
| GET | `/v1/analytics/savings-breakdown?period=30d` | Per-vector savings with confidence |
| GET | `/v1/analytics/providers?period=30d` | Provider/model distribution |
| GET | `/v1/analytics/insights?period=30d` | Actionable recommendations |

### Response types (TypeScript)

```typescript
// GET /v1/analytics/summary
type AnalyticsSummary = {
  period: string;
  total_requests: number;
  total_cost_usd: number;
  total_cost_without_gateway_usd: number;
  total_savings_usd: number;
  savings_pct: number;
  avg_latency_ms: number;
  cache_hit_rate: number;
  rag_usage_rate: number;
  error_rate: number;
  roi: number | null;
  plan: string;
  plan_price_usd: number;
  data_confidence: "sufficient" | "insufficient" | "collecting";
  request_count_threshold_met: boolean;
};

// GET /v1/analytics/timeline
type TimelinePoint = {
  date: string;
  requests: number;
  cost_usd: number;
  cost_without_gateway_usd: number;
  savings_usd: number;
  cache_hit_rate: number;
};

// GET /v1/analytics/savings-breakdown
type SavingsVector = {
  vector: "cache" | "routing" | "trimming";
  savings_usd: number;
  pct_of_total: number;
  confidence: "measured" | "calculated" | "estimated";
  request_count: number;
  description_pt: string;
  description_en: string;
};

// GET /v1/analytics/providers
type ProviderUsage = {
  provider: string;
  requests: number;
  cost_usd: number;
  avg_latency_ms: number;
  pct_of_total: number;
};
type ModelUsage = {
  model: string;
  provider: string;
  requests: number;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  pct_of_total: number;
};

// GET /v1/analytics/insights
type Insight = {
  type: "cost_trend" | "cache_opportunity" | "model_recommendation" | "savings_milestone";
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  confidence: "measured" | "calculated" | "estimated";
};
```

---

## 6. Component Architecture

### Route structure

```
app/(app)/dashboard/analytics/
  page.tsx                    -- Server component, parallel data fetch
  loading.tsx                 -- Skeleton
  components/
    analytics-hero.tsx        -- Hero: savings + ROI
    savings-timeline.tsx      -- Dual area chart (Recharts)
    savings-breakdown.tsx     -- Per-vector cards with confidence badges
    provider-breakdown.tsx    -- Donut + model table (Recharts)
    insights-panel.tsx        -- Actionable insights
    confidence-badge.tsx      -- Reusable badge
    period-selector.tsx       -- 7d/30d/90d (client component)
    empty-state.tsx           -- 3 empty states
```

### What to reuse from monitor-dashboard

| Monitor Component | Reuse as | Changes needed |
|-------------------|----------|----------------|
| `SavingsSection.tsx` (dual area chart) | `savings-timeline.tsx` | Real data, rikuchan-web tokens |
| `KPICards.tsx` (AnimatedNumber) | `analytics-hero.tsx` | Simplify to 3 metrics |
| `ProviderSection.tsx` (donut + table) | `provider-breakdown.tsx` | Remove stacked area |
| `lib/utils.ts` (formatters) | `lib/format.ts` | Direct port |

### What NOT to show to clients

- `EmbeddingSection`, `AgentsSection`, `RagRequestsSection`, `CollectionsSection` (internal ops)
- `CacheSection` with percentiles/histograms (too technical)
- `ErrorsSection` with stack traces (internal debugging)

### Design tokens (rikuchan-web, NOT monitor-dashboard)

```css
--accent: #34d399        /* emerald-400 */
--accent-deep: #10b981   /* emerald-500 */
--background: #09090b    /* zinc-950 */
--surface: #18181b       /* zinc-900 */
--line: #27272a          /* zinc-800 */
--danger: #f87171        /* red-400 */
--warning: #fbbf24       /* amber-400 */
```

Fonts: Sora (display/hero), Inter (body), IBM Plex Mono (metrics/labels).

### Tier gating

| Feature | Starter (Free) | Team ($49) | Scale (Custom) |
|---------|----------------|------------|----------------|
| Summary KPIs | Yes | Yes | Yes |
| Savings timeline | 7 days | 90 days | 365 days |
| Savings breakdown | Total only | By vector | By vector + per-model |
| Provider breakdown | Top 3 | All | All + latency |
| Insights | 2 generic | 5 personalized | Unlimited |
| Export CSV | No | Yes | Yes + API |

---

## 7. Copy & Content

### Bilingual (PT-BR / EN)

Implemented via `lib/i18n.ts` — simple key-value dictionary with `t(locale, key, vars)` helper.

### Confidence badges

| Level | Color | PT-BR | EN |
|-------|-------|-------|-----|
| 🟢 Measured | emerald | "Baseado em dados reais" | "Based on actual data" |
| 🟡 Calculated | amber | "Calculado com premissa documentada" | "Calculated with documented premise" |
| 🔴 Estimated | orange | "Projecao estimada" | "Estimated projection" |

### Tone guidelines

- Data-driven, not salesy
- "Voce economizou $X com Y requests otimizados" — NOT "Economia incrivel!"
- When savings = 0: "Nenhuma economia detectada" — NOT "Comece a economizar!"
- Each metric has `(?)` tooltip with formula in plain language

### Glossary

| Term | PT-BR | EN |
|------|-------|-----|
| Roteamento Inteligente | O Rikuchan escolhe o modelo mais economico para a complexidade da tarefa | Rikuchan picks the most cost-effective model for your task's complexity |
| Cache Semantico | Quando uma pergunta similar ja foi respondida, a resposta e reutilizada sem custo | When a similar question was already answered, the response is reused at zero cost |
| Contexto Enriquecido | O Rikuchan injeta conhecimento do seu projeto para respostas mais precisas | Rikuchan injects your project knowledge for more accurate answers |

---

## 8. Phased Implementation

```
Phase 0: Tenant Isolation (BLOCKER)
  ├── SQLite migration 7 (user_id)
  ├── store.py INSERT fix + service_role_key
  ├── context_trimmer.py → return tokens_saved
  ├── handler.py → thread tokens_trimmed
  ├── Supabase: tokens_trimmed column + index + RLS
  └── Clerk JWT template in Supabase (manual)

Phase 1: Documentation
  ├── ADR 001
  ├── Calculation Model doc
  └── CLIENT_DASHBOARD_PLAN.md (this file)

Phase 2: Gateway API
  ├── src/api/analytics.py (5 endpoints)
  ├── Register router in main.py
  └── TypeScript types + fetch functions in rikuchan-web

Phase 3: Frontend
  ├── Install recharts
  ├── lib/format.ts + lib/i18n.ts
  ├── Analytics sidebar link
  ├── Analytics page + 8 components
  └── Tier gating + empty states

Phase 4: Content & Polish
  ├── Confidence badges component
  ├── Bilingual copy for all text
  ├── Glossary panel
  └── Tooltip "How we calculate" for each metric
```

### Dependency graph

```
Phase 0 ← BLOCKER
  │
  ├── Phase 1 (docs — can parallel with Phase 0)
  │
  └── Phase 2 (API — needs Phase 0 for RLS + tokens_trimmed)
       │
       └── Phase 3 (Frontend — needs Phase 2 for endpoints)
            │
            └── Phase 4 (Content — can partially parallel with Phase 3)
```
