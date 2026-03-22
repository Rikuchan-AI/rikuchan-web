# Multi-Tenancy — Technical Reference

> **ADR**: [005-multi-tenancy-clerk-organizations-supabase-rls](adr/005-multi-tenancy-clerk-organizations-supabase-rls.md)

## Resumo

O Mission Control usa **Clerk Organizations como tenant** + **Supabase RLS como defense-in-depth**.
Cada tenant é identificado por `tenant_id = COALESCE(org_id, user_id)`:

- **Personal account**: `tenant_id = user_id` (sem org)
- **Organization**: `tenant_id = org_id` (Clerk Organization)

---

## Tenant Resolution

### Server-side (API Routes)

```typescript
import { resolveTenantId } from "@/lib/mc/tenant";

const { tenantId, userId, role } = await resolveTenantId();
// tenantId: org_id ou user_id
// userId: sempre o Clerk user_id (para audit trail)
// role: "owner" | "admin" | "operator" | "viewer"
```

### Client-side (React Components)

```typescript
import { usePermissions } from "@/hooks/use-permissions";

const { role, canWrite, canDelete, canManageMembers } = usePermissions();
```

### Auto-Provisioning

O tenant é auto-provisionado no primeiro acesso via `ensureTenant()` no endpoint
`/api/mc/tenant`. Um row em `tenants` é criado com `type: "personal"` e `plan: "free"`.

---

## Roles & Permissions

| Role | Read | Write | Delete | Manage Members | Manage Billing | Manage Settings |
|------|------|-------|--------|----------------|----------------|-----------------|
| **Owner** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Admin** | Yes | Yes | Yes | Yes | No | Yes |
| **Operator** | Yes | Yes | No | No | No | No |
| **Viewer** | Yes | No | No | No | No | No |

### Enforcement

- **API Route** (`app/api/mc/[...path]/route.ts`):
  - GET → any authenticated user
  - POST/PATCH → `operator+` (via `requireRole()`)
  - DELETE → `admin+`
- **UI** → `usePermissions()` hook hides buttons based on role
- **Supabase RLS** → defense-in-depth (não executa com `service_role`)

### Clerk Role Mapping

| Clerk Role | Our Role |
|---|---|
| `org:admin` | admin |
| `org:member` | operator |
| Personal account (no org) | owner |

Customizar no Clerk Dashboard: Configure → Settings → Organizations → Roles.

---

## Plan Limits

| Resource | Free | Starter | Team | Enterprise |
|---|---|---|---|---|
| Members | 1 | 3 | 10 | Unlimited |
| Projects | 1 | 3 | 10 | Unlimited |
| Agents/project | 2 | 5 | 15 | Unlimited |
| Tasks/project | 20 | 100 | 500 | Unlimited |
| API Keys | 2 | 5 | 20 | Unlimited |
| Storage | 100MB | 1GB | 10GB | Custom |
| Token budget/mo | $5 | $25 | $100 | Custom |
| Analytics retention | 7d | 30d | 90d | 365d |
| Dedicated gateway | No | No | Yes | Yes |

`0` em `tenant_plans.limits` = unlimited.

### Enforcement

```typescript
import { checkLimit, LimitExceededError } from "@/lib/mc/plan-limits";

await checkLimit(tenantId, "max_projects");
// Throws LimitExceededError se exceder
```

Cache in-memory com TTL 60s. Invalidar com `invalidatePlanCache(tenantId)` após upgrade.

---

## Database Schema

### tenant_id em tabelas existentes

Toda tabela que tinha `user_id` agora também tem `tenant_id`:

```
mc_projects, mc_board_groups, mc_tasks, mc_pipelines,
mc_memory_docs, mc_triggers, mc_chat_sessions,
mc_notifications, mc_user_settings

rag_chunks, collections, rag_requests, rag_ingest_requests

api_keys, provider_credentials, gateway_requests,
agent_heartbeats, daily_metrics, embedding_metrics
```

**`user_id` continua existindo** — usado para audit trail (quem criou/modificou dentro do tenant).
Queries filtram por `tenant_id`, inserts gravam ambos.

### Novas tabelas

| Tabela | Propósito | RLS |
|---|---|---|
| `tenants` | Registro de cada tenant (personal ou org) | `id = app_tenant_id()` |
| `tenant_plans` | Definição de planos e limites | Readable by all |
| `tenant_gateways` | Gateway dedicado por tenant | `tenant_id = app_tenant_id()` |
| `feature_flags` | Feature flags por plano/tenant | Readable by all |
| `tenant_usage` | Usage tracking por dia | `tenant_id = app_tenant_id()` |
| `backoffice_audit` | Audit log de ações staff | RLS enabled, no policy (service_role only) |

### RLS Function

```sql
CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS TEXT AS $$
  SELECT COALESCE(
    nullif(current_setting('app.tenant_id', true), ''),
    (auth.jwt() -> 'o'::text) ->> 'id'::text,
    auth.jwt() ->> 'sub'::text
  )::text;
$$ LANGUAGE sql STABLE;
```

---

## RAG Tenant Isolation

### Vector Search

`match_chunks()` filtra por `tenant_id` **dentro do CTE** (no vector scan):

```sql
WITH candidates AS (
  SELECT ... FROM rag_chunks rc
  WHERE rc.embedding_status = 'embedded'
    AND rc.embedding IS NOT NULL
    AND rc.tenant_id = effective_tenant  -- filtro no scan, não no post-filter
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count * 3
)
```

Isso é mais performante que o padrão anterior (filtrar só no WHERE final) e garante
que chunks de outro tenant nunca aparecem nos candidates.

### BM25

`_fetch_chunks_for_bm25()` no agent runtime filtra por `tenant_id` ao reconstruir o índice.

### Gateway

`_insert_rag_request()` e `match_chunks()` RPC incluem `p_tenant_id` / `tenant_id` nos payloads.

---

## Back Office

### Acesso

Rota `/admin` protegida por `STAFF_USER_IDS` env var (lista de Clerk user IDs separados por vírgula).

```env
STAFF_USER_IDS=user_abc123,user_def456
```

### Funcionalidades

| Página | Rota | Descrição |
|---|---|---|
| Overview | `/admin` | Métricas: total tenants, projetos, distribuição por plano |
| Tenants | `/admin/tenants` | Lista com search, filtro por tipo/plano/status |
| Tenant Detail | `/admin/tenants/[id]` | Overview, limites, actions (suspend, change plan) |
| Feature Flags | `/admin/feature-flags` | CRUD: create, toggle global, delete |
| Usage | `/admin/usage` | Consumo por tenant: tokens, requests, custo |

### Audit Log

Toda ação staff é logada em `backoffice_audit`:

```json
{
  "staff_user_id": "user_abc123",
  "action": "change_plan",
  "target_tenant_id": "org_xyz789",
  "details": { "plan": "team" }
}
```

---

## Feature Flags

```typescript
import { isFeatureEnabled } from "@/lib/mc/feature-flags";

if (await isFeatureEnabled(tenantId, "sprint_planning", tenantPlan)) {
  // feature is on
}
```

Flags podem ser habilitados:
- **Globalmente** (`enabled_globally: true`)
- **Por plano** (`enabled_plans: ["team", "enterprise"]`)
- **Por tenant específico** (`enabled_tenants: ["org_abc123"]`)

Cache 30s. Invalidar com `invalidateFlagsCache()`.

---

## Gateway Auth

O `AuthResult` do gateway agora inclui:

```python
class AuthResult(TypedDict):
    user_id: str | None       # Internal user UUID
    org_id: str | None        # Clerk org_id (if active org)
    tenant_id: str | None     # coalesce(org_id, user_id)
    source: str               # "apikey" | "clerk" | "passthrough" | "legacy_key"
    rate_limit_rpm: int
```

Para Clerk JWT auth, `org_id` é extraído do campo `o.id` do payload JWT.
Para API key auth, `tenant_id = user_id` (até API keys terem `tenant_id` próprio).

---

## Configuração

### Env vars necessárias

```env
# Clerk (já existente)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Clerk Organizations: habilitar no Dashboard
# Configure → Settings → Organizations → Enable

# Back Office
STAFF_USER_IDS=user_xxx,user_yyy  # Clerk user IDs dos staff
```

### Clerk Dashboard Setup

1. Enable Organizations: Configure → Settings → Organizations
2. Create custom roles: owner, admin, operator, viewer
3. (Opcional) JWT Template: incluir org claims para RLS futura
