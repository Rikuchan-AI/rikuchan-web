# Changelog

## 2026-03-22

### Multi-Tenancy + Back Office (ADR-005)

Transformação de single-user para multi-tenant com Clerk Organizations + Supabase RLS.

#### Tenant Foundation

- **`tenant_id` em todas as tabelas** — 9 tabelas `mc_*` receberam coluna `tenant_id TEXT NOT NULL`,
  backfill `tenant_id = user_id`. Zero breaking change para users existentes.
- **`app_tenant_id()`** — função SQL com fallback chain (current_setting → JWT org_id → JWT sub).
  RLS policies como defense-in-depth em todas as tabelas.
- **Novas tabelas platform** — `tenants`, `tenant_plans` (4 planos seed), `tenant_gateways`,
  `feature_flags`, `tenant_usage`, `backoffice_audit`.
- **`lib/mc/tenant.ts`** — `resolveTenantId()` (COALESCE org_id/user_id), `ensureTenant()`
  (auto-provision), `requireRole()` (server-side RBAC).
- **API route migrada** (`app/api/mc/[...path]/route.ts`) — todas as queries de `.eq("user_id")`
  para `.eq("tenant_id")`. Inserts mantêm `user_id` para audit trail.

#### Clerk Organizations

- **`OrganizationSwitcher`** no header (`dashboard-shell.tsx`) — permite trocar entre personal
  account e orgs. Usa appearance config existente em `lib/clerk.ts`.
- **Plan badge dinâmico** no sidebar (`dashboard-sidebar.tsx`) — substitui "Rikuchan Starter"
  hardcoded por `useTenantPlan()` hook.
- **Tenant info endpoint** (`app/api/mc/tenant/route.ts`) — retorna plano, limites, features.
  Auto-provision do tenant no primeiro acesso.
- **Organization settings** (`dashboard/settings/organization/page.tsx`) — página com
  `<OrganizationProfile />` do Clerk (membros, invite, roles).

#### Roles & Permissions

- **`lib/mc/permissions.ts`** — sistema RBAC: owner > admin > operator > viewer.
  `hasPermission()`, `meetsMinimumRole()`, `normalizeClerkRole()`.
- **`hooks/use-permissions.ts`** — hook client-side `usePermissions()` que resolve role do
  Clerk Organization membership.
- **API enforcement** — POST requer `operator+`, PATCH requer `operator+`,
  DELETE requer `admin+`. Viewers são read-only.

#### Plans & Limits

- **`lib/mc/plan-limits.ts`** — `checkLimit()` com cache in-memory (TTL 60s).
  `LimitExceededError` com resource/limit/current.
- **Plan enforcement na API** — antes de criar projetos e tasks, verifica limites do plano.
  Retorna 403 com detalhes quando excede.
- **`limit-exceeded-dialog.tsx`** — modal que mostra limite atingido com CTA de upgrade.

#### Back Office

- **Admin layout** (`app/(admin)/layout.tsx`) — staff-only guard via env `STAFF_USER_IDS`.
- **Admin shell** (`components/admin/admin-shell.tsx`) — sidebar com Overview, Tenants, Usage, Flags.
- **Tenants list** — tabela com search, type badge, plan badge, status, link para detalhe.
- **Tenant detail** — overview com métricas, limites do plano, actions (suspend/unsuspend,
  change plan). Todas as ações logadas em `backoffice_audit`.
- **Feature flags** — CRUD completo. Toggle global, por plano, por tenant.
  `isFeatureEnabled()` com cache 30s.
- **Usage dashboard** — agregação por tenant de tokens, requests, custo.
- **Admin API routes** — `/api/admin/tenants/[tenantId]` (PATCH) e
  `/api/admin/feature-flags` (POST/PATCH/DELETE).

## 2026-03-21

### Loading Skeletons + Heartbeat Free-Tier Refactor

#### Loading States (UX)

- **AgentGrid** (`components/mc/agents/AgentGrid.tsx`) — novo prop `loading?: boolean`. Quando
  `loading && agents.length === 0`, exibe `SkeletonGrid` (6 cards) em vez de `EmptyState`.
  Evita flash de empty state logo após conectar ao gateway.
- **agents/page** (`app/(app)/agents/page.tsx`) — lê `agentsLoaded` do store, passa
  `loading={isConnected && !agentsLoaded}` para `AgentGrid`. Skeleton só aparece quando
  conectado — desconectado mostra `EmptyState` normalmente.
- **HeartbeatModelSelector** (`components/mc/settings/HeartbeatModelSelector.tsx`) — exibe
  `SkeletonList` (4 linhas) enquanto `configFreeGroups === null` (RPC config.get em voo).
  Adiciona search/collapse à lista de modelos.
- **FreeModelsCatalog** (`components/mc/settings/FreeModelsCatalog.tsx`) — exibe
  `SkeletonList` (4 linhas) durante loading em vez de texto "Carregando…". Adiciona
  search/collapse. Simplifica badge para contagem única.

#### Heartbeat Free-Tier (ADR-004)

- **getFreeModelsFromConfig** (`lib/mc/agent-files.ts`) — nova função que busca providers via
  RPC `config.get` do gateway, filtra modelos com `cost.input === 0 && cost.output === 0`,
  retorna agrupado por provider. Exclui `rikuchan-heartbeat` da lista exibida ao usuário.
- **HeartbeatModelSelector** refatorado para usar `getFreeModelsFromConfig()` em vez de
  filtrar `availableModels` do store. Fallback para lista hardcoded quando config retorna vazia.
- **FreeModelsCatalog** refatorado para usar `getFreeModelsFromConfig()` diretamente, sem
  depender de props do parent.

#### Outros

- `AgentCard`, `LeadBoardAgentSelector`, `AgentGlobalDefaults`, `gateway-store`, `models`,
  `mc-utils`, `agent-files` — mudanças de suporte ao conjunto acima.
