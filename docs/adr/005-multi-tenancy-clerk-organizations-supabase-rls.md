# ADR 005 — Multi-Tenancy via Clerk Organizations + Supabase RLS

- **Status**: Accepted
- **Date**: 2026-03-22
- **Authors**: William Komori, Claude (co-authored)

## Contexto

O Mission Control era single-user: toda tabela `mc_*` filtrava por `user_id` no app layer usando
`service_role` key (zero RLS). Para habilitar SaaS multi-user com times compartilhando dados,
precisamos de tenant isolation, roles, plan limits e um back office admin.

### Restrições

- Stack existente: Next.js App Router + Clerk + Supabase + OpenClaw Gateway — não adicionar camadas
- Supabase usa `service_role` key em todas as queries server-side (refatorar para JWT client seria massivo)
- Gateway e agent runtime são componentes separados que precisam continuar funcionando durante a migração
- Zero breaking changes para users existentes

## Decisão

### Estratégia: Clerk Organizations como tenant + Supabase RLS como defense-in-depth

**Tenant identity**: `tenant_id = COALESCE(org_id, user_id)` — para users sem org (personal account),
o `user_id` é o tenant. Para users com org ativa, o `org_id` do Clerk é o tenant.

**Enforcement**: app-layer (API route filtra por `tenant_id`) + RLS via função `app_tenant_id()` como
segunda camada. O `service_role` key bypassa RLS, mas as policies existem para qualquer futuro acesso
direto (JWT client, migrations, etc).

**Roles**: Clerk Organization roles (owner/admin/operator/viewer) com enforcement server-side via
`requireRole()` e client-side via `usePermissions()`.

### Alternativas avaliadas e descartadas

| Estratégia | Descartada porque |
|---|---|
| Schema-per-tenant (Supabase) | Overhead de migrations por schema, desnecessário para esse porte |
| Database-per-tenant (Neon) | Custo alto, complexidade de gestão, sem benefício real vs RLS |
| Auth própria (sem Clerk) | 4-5 sprints extras, sem org management, sem billing nativo |
| JWT client ao invés de service_role | Refator massivo da API route e storage adapters sem benefício imediato |
| Backend dedicado para tenant isolation | Supabase RLS + app-layer resolve, não precisa de middleware extra |

## Implementação

### Modelo de Tenant

```
Tenant (Clerk Organization ou Personal Account)
  ├── Membros (Clerk Users com roles)
  │   ├── Owner — pode tudo
  │   ├── Admin — pode tudo exceto deletar org/billing
  │   ├── Operator — CRUD de projetos/tasks, opera board
  │   └── Viewer — read-only
  ├── Plano (free/starter/team/enterprise)
  └── Dados (mc_projects, mc_tasks, etc. filtrados por tenant_id)
```

### Função SQL Central

```sql
CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS TEXT AS $$
  SELECT COALESCE(
    nullif(current_setting('app.tenant_id', true), ''),
    (auth.jwt() -> 'o'::text) ->> 'id'::text,
    auth.jwt() ->> 'sub'::text
  )::text;
$$ LANGUAGE sql STABLE;
```

Fallback chain: `current_setting` (service_role pattern) → JWT org_id → JWT user_id.

### Migração de Dados

Todas as tabelas receberam coluna `tenant_id TEXT NOT NULL` com backfill `tenant_id = user_id`.
Zero breaking change — para users existentes sem org, tudo funciona identicamente.

### Tabelas Afetadas

**rikuchan-web** (9 tabelas mc_*):
`mc_projects`, `mc_board_groups`, `mc_tasks`, `mc_pipelines`, `mc_memory_docs`,
`mc_triggers`, `mc_chat_sessions`, `mc_notifications`, `mc_user_settings`

**rikuchan-ai-gateway** (RAG + infra):
`rag_chunks`, `collections`, `rag_requests`, `rag_ingest_requests`,
`api_keys`, `provider_credentials`, `gateway_requests`, `agent_heartbeats`,
`daily_metrics`, `embedding_metrics`

**Novas tabelas platform**:
`tenants`, `tenant_plans`, `tenant_gateways`, `feature_flags`, `tenant_usage`, `backoffice_audit`

### RAG Tenant Isolation

**Crítico**: `match_chunks()` (pgvector RPC) foi reescrita para filtrar por `tenant_id` **dentro**
do CTE (no vector scan), não apenas no WHERE final. Isso garante:
1. Sem data leak cross-tenant via busca semântica
2. Melhor performance (scan limitado ao tenant, não ao banco inteiro)

BM25 index rebuild no agent runtime também filtra por `tenant_id`.

### Gateway Auth

`AuthResult` expandido com `org_id` e `tenant_id`. O gateway extrai org claims do Clerk JWT
(`payload.o.id`). Para API keys, `tenant_id = user_id` até que keys tenham coluna `tenant_id`.

### Back Office

Rota `/admin` protegida por env `STAFF_USER_IDS`. Usa `service_role` key sem filtro de tenant
(staff vê tudo). Audit log em `backoffice_audit` para todas as ações.

## Consequências

### Positivas
- Zero breaking change para users existentes
- Clerk Organizations dá de graça: convites, roles, billing por org, org switcher UI
- RLS como defense-in-depth protege contra bugs no app layer
- Cada sprint é deployável independentemente
- `match_chunks()` filtrando no CTE é mais performante que o padrão anterior

### Negativas
- `service_role` bypassa RLS — enforcement primário é app-layer (API route)
- Plan limits usam cache in-memory (60s TTL) — eventual consistency na checagem
- Agent runtime é single-user-per-instance — membros de org compartilham via web, não via agent
- Feature flags são simples (array de plans/tenants) — sem targeting avançado

### Riscos mitigados
- **RAG data leak**: `match_chunks()` filtra por `tenant_id` no CTE, BM25 por `tenant_id`
- **Gateway ownership**: JWT do Clerk já carrega `org_id`, gateway resolve automaticamente
- **Plan limits race condition**: cache de 60s é aceitável; operações de escrita são infrequentes

## Arquivos-Chave

| Arquivo | Propósito |
|---|---|
| `lib/mc/tenant.ts` | `resolveTenantId()`, `ensureTenant()`, `requireRole()` |
| `lib/mc/permissions.ts` | RBAC: `hasPermission()`, `meetsMinimumRole()` |
| `lib/mc/plan-limits.ts` | `checkLimit()` com cache in-memory |
| `lib/mc/feature-flags.ts` | `isFeatureEnabled()` com cache |
| `lib/mc/staff.ts` | `isStaff()`, `requireStaff()` |
| `app/api/mc/[...path]/route.ts` | API CRUD central — filtro por `tenant_id` |
| `app/api/mc/tenant/route.ts` | Tenant info + auto-provision |
| `hooks/use-permissions.ts` | Client-side RBAC hook |
| `hooks/use-tenant-plan.ts` | Plan display hook |
| `rikuchan-ai-gateway/src/proxy/auth.py` | `AuthResult` com `org_id`/`tenant_id` |
| `rikuchan-agent/src/auth.py` | `effective_tenant_id()` |
| `rikuchan-agent/src/search/bm25.py` | BM25 rebuild por `tenant_id` |
