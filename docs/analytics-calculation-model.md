# Rikuchan Client Analytics — Calculation Model

> This document describes every formula used in the client analytics dashboard.
> Each metric includes: what it measures, how it's computed, what data it reads,
> confidence classification, and the tooltip text shown to the customer.
>
> **Audience**: Engineers implementing/maintaining the analytics endpoints, and
> product reviewers validating that every number is honest and defensible.

---

## 1. Data Sources

### 1.1 `gateway_requests` (Supabase)

The **single source of truth** for the client dashboard. Key columns:

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | text | Clerk user ID (from JWT `sub` claim) |
| `created_at` | timestamptz | Request timestamp |
| `cost_usd` | float | Actual cost paid through Rikuchan |
| `cost_without_gateway_usd` | float | Counterfactual cost (what would have been paid without Rikuchan) |
| `cache_hit` | boolean | True if Rikuchan semantic cache served the response |
| `cached_tokens` | integer | Anthropic prompt cache tokens (provider-level, not Rikuchan cache) |
| `model` | text | Model actually used |
| `original_model` | text | Model the client originally requested |
| `model_override_applied` | boolean | True if routing changed the model |
| `routing_method` | text | How the model was selected |
| `input_tokens` | integer | Input tokens billed |
| `output_tokens` | integer | Output tokens billed |
| `tokens_trimmed` | integer | Tokens removed by context trimmer (NEW — added in Phase 0) |
| `rag_augmented` | boolean | Whether RAG context was injected |
| `rag_chunks_used` | integer | Number of RAG chunks injected |
| `provider` | text | Provider used (anthropic, openai, google, etc.) |
| `latency_ms` | integer | Total latency |
| `status` | text | "success" or error type |

### 1.2 `providers.yaml` (Gateway config)

Pricing table per model. Format:
```yaml
providers:
  anthropic:
    models:
      claude-sonnet-4-6:
        pricing: [3.0, 15.0]  # [input_per_1M_tokens, output_per_1M_tokens]
```

Used by `ProviderRegistry.get_pricing(model)` → returns `[input_price, output_price]`.

### 1.3 Clerk Billing

Plan price per tier:
- Starter: $0 (free)
- Team: $49/month
- Scale: custom (stored in Clerk organization metadata)

---

## 2. Existing Formula Audit

### 2.1 `cost_usd` — Actual request cost

**Location**: `rikuchan-ai-gateway/src/observability/logger.py:8-18`

```python
def estimate_cost(model, tokens_in, tokens_out):
    pricing = registry.get_pricing(model)  # [input_per_1M, output_per_1M]
    input_cost = (tokens_in / 1_000_000) * pricing[0]
    output_cost = (tokens_out / 1_000_000) * pricing[1]
    return round(input_cost + output_cost, 6)
```

**Audit verdict**: **KEEP**
- Formula is mathematically correct
- Depends on `providers.yaml` pricing accuracy (must be kept updated)
- Token counts come from provider SSE `usage` field (actual, not estimated)
- When `cache_hit = true` (Rikuchan semantic cache), `cost_usd = 0` (no provider call made)

**Risk**: If `providers.yaml` has stale prices, cost will be wrong. Mitigation: periodic pricing validation.

### 2.2 `cost_without_gateway_usd` — Counterfactual cost

**Location**: `rikuchan-ai-gateway/src/proxy/handler.py:848`

```python
cost_without_gateway = estimate_cost(active_model, tokens_in + cache_read, tokens_out)
```

**Audit verdict**: **KEEP (with documented premise)**

The formula adds `cache_read` tokens to `tokens_in`. The premise:
- **Without Rikuchan gateway**, Anthropic's prompt caching would not be managed, so those tokens would be billed at full input rate instead of the reduced cached rate.
- Uses `active_model` (not `original_model`) — this means it captures cache savings but NOT routing savings in the per-request `cost_without_gateway_usd`.

**Important nuance**: For requests where `cache_hit = true` (Rikuchan semantic cache), `cost_usd = 0` but `cost_without_gateway_usd` reflects the full cost of what WOULD have been paid. This is correct — the entire provider call was avoided.

### 2.3 `total_savings_usd` — Global daily savings

**Location**: `rikuchan-ai-gateway/src/observability/aggregator.py:121`

```python
total_savings = max(total_cost_without_gateway - total_cost, 0.0)
```

**Audit verdict**: **KEEP for global use, RECOMPUTE for per-user**

The `daily_metrics` table has no `user_id`, so this value is global. For the client dashboard, we recompute:
```sql
SELECT SUM(cost_without_gateway_usd - cost_usd) AS total_savings
FROM gateway_requests
WHERE user_id = :uid AND created_at >= :start;
```

### 2.4 Savings breakdown percentages — FAKE

**Location**: `rikuchan-monitor-dashboard/app/api/savings/route.ts:65-70`

```typescript
breakdown: {
  cache: totalSavings * 0.55,
  routing: totalSavings * 0.25,
  rag: totalSavings * 0.12,
  prompt_opt: totalSavings * 0.08,
}
```

**Audit verdict**: **REWRITE — completely fabricated**

These percentages have no basis in actual data. The real breakdown requires per-vector SQL queries (see Section 3).

### 2.5 ROI formula — FAKE

**Location**: `rikuchan-monitor-dashboard/app/api/savings/route.ts:50-52`

```typescript
const gatewayCost = totalCostWith * 0.05;
const roi = gatewayCost > 0 ? (totalSavings / gatewayCost) * 100 : 0;
```

**Audit verdict**: **REWRITE — fictitious overhead assumption**

The 5% "gateway cost" is invented. Real ROI = `savings / plan_price` (see Section 4).

---

## 3. Real Savings Breakdown Formulas

### 3.1 Cache Savings (Semantic Cache)

**Confidence**: 🟢 Measured

**What it measures**: Money saved when Rikuchan's semantic cache serves a response directly, completely avoiding a provider API call.

**Formula**:
```sql
SELECT
  SUM(cost_without_gateway_usd) AS cache_savings_usd,
  COUNT(*) AS cache_hit_count
FROM gateway_requests
WHERE user_id = :uid
  AND created_at >= :start
  AND cache_hit = true;
```

**Why `cost_without_gateway_usd` and not `cost_usd`**: When `cache_hit = true`, `cost_usd = 0` (no provider call). The `cost_without_gateway_usd` represents what the user WOULD have paid — that's the savings.

**Prompt caching savings** (Anthropic `cached_tokens`): These are already embedded in the per-request `cost_usd` vs `cost_without_gateway_usd` difference. When `cached_tokens > 0` but `cache_hit = false`, the formula at `handler.py:848` adds those tokens at full price in the counterfactual, while the actual cost uses the reduced cached rate. This difference is captured in the total `cost_without_gateway - cost` savings but is NOT separately attributed to a "prompt caching" vector. This is acceptable — it's folded into the total savings.

**Suppression**: Don't show this card if `cache_hit_count = 0`.

**Tooltip (PT-BR)**: "Quando uma pergunta similar ja foi respondida, o Rikuchan serve a resposta do cache sem custo de provider. Este valor e o custo total evitado."

**Tooltip (EN)**: "When a similar question was already answered, Rikuchan serves it from cache at zero provider cost. This value is the total avoided cost."

---

### 3.2 Routing Savings (Smart Routing)

**Confidence**: 🟡 Calculated

**What it measures**: Money saved when Rikuchan routes a request to a cheaper model than the one originally requested by the client.

**Formula** (two-step — SQL pre-filter + Python computation):

```sql
-- Step 1: Get rerouted requests
SELECT original_model, model, input_tokens, output_tokens, cost_usd
FROM gateway_requests
WHERE user_id = :uid
  AND created_at >= :start
  AND model_override_applied = true;
```

```python
# Step 2: Compute savings per request
routing_savings = 0.0
routing_count = 0
for row in rerouted_requests:
    original_pricing = registry.get_pricing(row.original_model)
    if not original_pricing:
        continue  # Skip if model not in pricing table
    would_have_cost = (row.input_tokens / 1_000_000) * original_pricing[0] \
                    + (row.output_tokens / 1_000_000) * original_pricing[1]
    savings = would_have_cost - row.cost_usd
    if savings > 0:
        routing_savings += savings
        routing_count += 1
```

**Why 🟡 Calculated and not 🟢 Measured**:
- Depends on `providers.yaml` having correct pricing for `original_model`
- Assumes the client would have actually used `original_model` (they might have self-corrected)
- If `original_model` is missing from the pricing table, the request is skipped (conservative)

**Suppression**: Don't show this card if all requests have `routing_method = 'client_requested'` (no routing happened) or `routing_count = 0`.

**Tooltip (PT-BR)**: "Quando o Rikuchan roteia uma tarefa simples para um modelo mais eficiente (ex: Haiku em vez de Sonnet), voce paga a diferenca. So contabiliza requests onde o modelo foi efetivamente trocado."

**Tooltip (EN)**: "When Rikuchan routes a simple task to a more efficient model (e.g., Haiku instead of Sonnet), you pay the difference. Only counts requests where the model was actually changed."

---

### 3.3 Context Trimming Savings

**Confidence**: 🟢 Measured

**What it measures**: Money saved when the context trimmer removes framework noise (boilerplate, redundant system prompts) from requests sent to cheap models.

**Prerequisite**: `tokens_trimmed` column in `gateway_requests` (added in Phase 0).

**Formula** (two-step — SQL aggregation + Python pricing):

```sql
-- Step 1: Aggregate trimmed tokens by model
SELECT model, SUM(tokens_trimmed) AS total_trimmed, COUNT(*) AS trim_count
FROM gateway_requests
WHERE user_id = :uid
  AND created_at >= :start
  AND tokens_trimmed > 0
GROUP BY model;
```

```python
# Step 2: Compute savings using model input pricing
trimming_savings = 0.0
trimming_count = 0
for model, total_trimmed, count in results:
    pricing = registry.get_pricing(model)
    if pricing:
        trimming_savings += (total_trimmed / 1_000_000) * pricing[0]
        trimming_count += count
```

**Why 🟢 Measured**: Token diff is computed at trim time in `context_trimmer.py` — it's a direct measurement, not an estimate.

**Suppression**: Don't show this card if `trimming_count = 0` (no trimming happened).

**Tooltip (PT-BR)**: "O Rikuchan remove ruido de contexto (boilerplate, prompts redundantes) antes de enviar ao modelo. Este valor reflete os tokens salvos multiplicados pelo preco de input do modelo."

**Tooltip (EN)**: "Rikuchan removes context noise (boilerplate, redundant prompts) before sending to the model. This value reflects saved tokens multiplied by the model's input price."

---

### 3.4 RAG — NOT a Savings Vector

**Why it's excluded**: RAG augmentation injects context chunks into the prompt, INCREASING `input_tokens`. It makes requests more expensive, not cheaper. The value of RAG is in answer quality (fewer follow-up questions, more accurate responses), which cannot be measured in dollar savings with current data.

**What we show instead** (usage metric, not savings):

```sql
SELECT
  COUNT(CASE WHEN rag_augmented THEN 1 END) AS rag_requests,
  COUNT(*) AS total_requests,
  AVG(CASE WHEN rag_augmented THEN rag_chunks_used END) AS avg_chunks
FROM gateway_requests
WHERE user_id = :uid AND created_at >= :start;
```

Display: "X requests enhanced with knowledge context (Y avg chunks)" — no dollar amount.

---

## 4. ROI Formula

```
ROI = total_savings_period / plan_price_period
```

| Plan | Price | ROI display |
|------|-------|-------------|
| Starter | $0 | Show savings amount; no ratio (division by zero) |
| Team | $49/month | `total_savings_30d / 49` (e.g., "3.2x return") |
| Scale | custom | `total_savings_30d / custom_price` |

**Plan price source**: Clerk Billing API. If unavailable, fall back to hardcoded prices from `rikuchan-web/app/(app)/dashboard/plans/page.tsx`.

**Display format**: "Retorno de Xx sobre o plano [Plan]" / "Xx return on your [Plan] plan"

**Confidence**: 🟡 Calculated — savings are measured, plan price is known, but ratio can fluctuate.

**Tooltip (PT-BR)**: "Economia total do periodo dividida pelo preco do seu plano. 5x significa que voce economizou 5 vezes o que pagou pelo Rikuchan."

**Tooltip (EN)**: "Total savings for the period divided by your plan price. 5x means you saved 5 times what you paid for Rikuchan."

---

## 5. Projected Annual Savings

**Confidence**: 🔴 Estimated

**Formula**:
```python
daily_avg_savings = total_savings_30d / 30
projected_annual = daily_avg_savings * 365
```

**Why 🔴 Estimated**: Extrapolation assumes usage patterns remain constant. Seasonality, team growth, model changes all affect accuracy.

**Tooltip (PT-BR)**: "Projecao baseada na media diaria dos ultimos 30 dias. Uso real pode variar."

**Tooltip (EN)**: "Projection based on daily average from the last 30 days. Actual usage may vary."

---

## 6. Confidence Classification Summary

| Level | Badge | Color | Meaning |
|-------|-------|-------|---------|
| Measured | 🟢 | emerald `#34d399` | Direct data from logs, no transformation beyond counting/summing |
| Calculated | 🟡 | amber `#fbbf24` | Transformation over measured data with documented premise |
| Estimated | 🔴 | orange `#f97316` | Extrapolation or assumption about counterfactual |

---

## 7. Suppression Criteria

To avoid showing misleading metrics from insufficient data:

| Condition | Behavior |
|-----------|----------|
| < 100 requests in selected period | Show "Insufficient data" banner, hide savings breakdown |
| < 7 days since first request | Show "Collecting data" state, hide all charts |
| Total savings < $0.01 | Don't show savings breakdown (noise) |
| 0 cache hits in period | Don't show cache savings card |
| 0 rerouted requests in period | Don't show routing savings card |
| 0 trimmed requests in period | Don't show trimming savings card |
| Only 1 savings vector has data | Show as total savings only, no breakdown chart |

---

## 8. Total Savings Consistency Check

The sum of individual savings vectors should be <= total savings:

```
cache_savings + routing_savings + trimming_savings <= total_savings
```

The total savings (`cost_without_gateway - cost`) may be larger than the sum of vectors because:
1. Prompt caching savings (Anthropic `cached_tokens`) are in the total but not separately attributed
2. Some savings may come from interactions between vectors (e.g., routing + caching on same request)

If `sum_of_vectors > total_savings` (should not happen, but defensive):
- Log a warning
- Show the total as the authoritative number
- Scale vector percentages to sum to 100% of the total

---

## 9. Currency and Formatting

- All values stored and computed in **USD**
- Display: `$X.XX` for values < $1,000; `$X.Xk` for $1,000-$999,999; `$X.XM` for $1,000,000+
- Percentages: one decimal place (e.g., "34.2%")
- Token counts: compact format ("1.2M", "45.3K", "892")
- ROI: one decimal place with "x" suffix (e.g., "3.2x")
