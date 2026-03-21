# Changelog

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
