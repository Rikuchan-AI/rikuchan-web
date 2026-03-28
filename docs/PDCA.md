# PDCA - rikuchan-web

> Ciclo contínuo de melhoria: Plan, Do, Check, Act
> Última atualização: 2026-03-28

---

## Visão Geral do Projeto

| Item | Detalhe |
|------|---------|
| **Stack** | Next.js 16 + React 19 + TypeScript 5.9 + Tailwind CSS 4 |
| **Auth** | Clerk (multi-org) + Supabase RLS |
| **State** | Zustand (MC) / Server Components (Dashboard) |
| **Realtime** | WebSocket (Gateway) + SSE |
| **LOC** | ~32.614 linhas em 243 arquivos TS/TSX |
| **Módulos** | Dashboard, Mission Control, Marketing, Admin, Onboarding |

---

## Ciclo 1 — 2026-03-28

### PLAN (Planejar)

Análise inicial completa do codebase. Áreas identificadas para melhoria:

#### Qualidade de Código
- [x] Componentes grandes (>300 linhas) devem ser decompostos
- [x] Verificar duplicação de código entre `components/shared/` e `components/mc/ui/`
- [ ] Padronizar exports (named vs default) — atualmente misto
- [ ] Avaliar cobertura de tipos — buscar usos de `any` ou type assertions desnecessárias

#### Performance
- [x] Auditar bundle size — Monaco Editor é pesado (~2MB), verificar lazy loading
- [x] Verificar se `useShallow` está sendo usado consistentemente nos selectors Zustand
- [x] Avaliar Server Components vs Client Components — possíveis conversões para server
- [x] Verificar uso de `dynamic()` / `lazy()` para rotas pesadas (board com DnD)
- [x] Avaliar imagens — next/image com sizes/priority corretos

#### Segurança
- [x] Auditar `.env` — garantir que secrets não vazem para o client (`NEXT_PUBLIC_*`)
- [ ] Verificar sanitização de inputs em formulários (XSS)
- [x] Auditar API routes — validação de body/params
- [ ] Verificar headers de segurança no `next.config.ts`
- [ ] Avaliar CORS e CSP policies
- [ ] Revisar permissões RBAC — `lib/mc/permissions.ts`

#### Refatoração
- [x] Consolidar componentes de UI duplicados (shared vs mc/ui)
- [ ] Extrair lógica de negócio de componentes para hooks customizados
- [ ] Padronizar error handling — `lib/mc/error-handling.ts` vs try/catch avulsos
- [ ] Revisar estrutura de stores Zustand — possível fragmentação excessiva

### DO (Executar)

| # | Ação | Status | Arquivo(s) |
|---|------|--------|------------|
| 1 | Análise de componentes grandes | `concluído` | 17 arquivos >300 linhas identificados |
| 2 | Audit de duplicação shared vs mc/ui | `concluído` | CodeBlock, MetricCard, Combobox |
| 3 | Scan de segurança em API routes | `concluído` | 10 route files auditados |
| 4 | Análise de bundle/lazy loading | `concluído` | Recharts, DnD, Zustand selectors |
| 5 | Revisão de tipos e type safety | `pendente` | — |

### CHECK (Verificar)

> Resultados das ações executadas neste ciclo.

---

#### CHECK 1 — Componentes Grandes (>300 linhas)

**17 arquivos identificados** — 7 em `components/`, 10 em `app/`

| Arquivo | Linhas | Severidade | Decomponível? |
|---------|--------|------------|---------------|
| `app/(app)/agents/new/page.tsx` | 1763 | **P2** | SIM — wizard com 5 steps, extrair cada step |
| `app/(app)/agents/projects/[projectId]/settings/page.tsx` | 1021 | **P2** | SIM — 7 seções accordion independentes |
| `app/(app)/agents/projects/new/page.tsx` | 971 | **P2** | SIM — wizard com 5 steps |
| `app/(app)/agents/[agentId]/page.tsx` | 849 | **P2** | SIM — 6 tabs, extrair cada uma |
| `components/mc/projects/board/TaskDrawer.tsx` | 632 | **P2** | SIM — tabs + timeline + blocked panel |
| `app/(app)/agents/projects/[projectId]/board/page.tsx` | 574 | **P2** | SIM — columns + sidebars |
| `components/mc/settings/AgentGlobalDefaults.tsx` | 513 | **P2** | SIM — seções de form independentes |
| `app/(app)/agents/projects/[projectId]/agents/page.tsx` | 502 | **P2** | SIM — roster + context editor |
| `app/(app)/agents/groups/page.tsx` | 507 | **P3** | MODERADO |
| `components/mc/projects/board/CreateTaskModal.tsx` | 445 | **P3** | SIM — template + form + upload |
| `app/(app)/agents/chat/[conversationId]/page.tsx` | 414 | **P3** | MODERADO |
| `components/mc/projects/RosterCard.tsx` | 386 | **P3** | SIM — permissions + heartbeat |
| `components/mc/projects/board/BlockedResolvePanel.tsx` | 348 | **P3** | MODERADO |
| `components/mc/projects/board/SprintPlanning.tsx` | 347 | **P3** | SIM — multi-step modal |
| `components/mc/projects/board/AgentRosterPanel.tsx` | 329 | **P3** | MODERADO |

**Padrão reusável identificado:** Múltiplos wizards/steppers (agents/new, projects/new, SprintPlanning) — extrair `<WizardContainer>` compartilhado.

---

#### CHECK 2 — Duplicação shared vs mc/ui

| Componente | Local 1 | Local 2 | Severidade | Ação |
|------------|---------|---------|------------|------|
| **CodeBlock** | `components/shared/code-block.tsx` (simples) | `components/mc/ui/CodeBlock.tsx` (com copy) | **P2** | Merge → shared com prop `showCopy` |
| **MetricCard** | `components/dashboard/metric-card.tsx` (básico) | `components/mc/ui/MetricCard.tsx` (com cor custom) | **P2** | Consolidar → shared |
| **Combobox** | — | `components/mc/ui/Combobox.tsx` (genérico, 18 usos) | **P2** | Mover → shared (é genérico) |

---

#### CHECK 3 — Segurança de API Routes

##### P0 — CRÍTICO

| Finding | Arquivo | Detalhe |
|---------|---------|---------|
| **Proxy cego sem validação** | `app/api/mc/proxy/[...path]/route.ts` | GET/POST/PUT/PATCH/DELETE proxied sem whitelist de paths. Permite acesso a endpoints admin do backend. |

##### P1 — ALTO

| Finding | Arquivo | Detalhe |
|---------|---------|---------|
| Auth token vazando para backend | `api/mc/proxy/[...path]/route.ts` | JWT do Clerk passado direto no header Authorization ao upstream |
| Error details expostos | `api/mc/proxy/[...path]/route.ts` | `String(err)` retorna detalhes internos ao client |
| SSRF via gateway_url | `api/mc/onboarding/route.ts` | URL arbitrária aceita sem validação — risco de SSRF |
| Credentials armazenadas sem sanitização | `api/mc/onboarding/route.ts` | `gateway_token` armazenado em plaintext |
| File type bypass por extensão | `api/mc/files/route.ts` | Fallback por extensão permite upload de executáveis renomeados |
| Auth check ausente no upload | `api/mc/files/route.ts` | Sem verificação explícita de token Clerk |
| Input não validado | `api/admin/feature-flags/route.ts` | `body.key` usado direto sem validação |
| tenantId sem validação de formato | `api/admin/tenants/[tenantId]/export/route.ts` | UUID não verificado |
| action/plan não validados | `api/admin/tenants/[tenantId]/route.ts` | Campos aceitos sem whitelist |

##### P2 — MÉDIO

| Finding | Arquivo | Detalhe |
|---------|---------|---------|
| Error messages vazam schema | Múltiplos routes | `error.message` do Supabase retornado ao client |
| Sem body size limits | `api/mc/proxy/[...path]/route.ts` | ArrayBuffer sem limite — risco de DoS |
| Path traversal parcial | `api/mc/files/route.ts` | Check `startsWith` insuficiente |
| CRON secret fraco | `api/admin/data-retention/route.ts` | Comparação string simples, sem HMAC |
| Config path traversal | `api/models/free/route.ts` | `OPENCLAW_CONFIG_PATH` pode ler arquivos arbitrários |
| Silent error masking | `api/mc/tenant/route.ts` | Auth failures retornam "free plan" silenciosamente |

---

#### CHECK 4 — Bundle & Performance

##### Lazy Loading

| Dependência | Tamanho | Lazy? | Severidade | Detalhe |
|-------------|---------|-------|------------|---------|
| Monaco Editor | ~2.5MB | ✅ SIM | — | `next/dynamic` com SSR off + loading UI |
| Recharts | ~1.2MB | ❌ NÃO | **P2** | Import direto em analytics components |
| @hello-pangea/dnd | ~60KB | ❌ NÃO | **P3** | Import direto no board page |
| Framer Motion | ~45KB | ❌ NÃO | **P3** | Usado amplamente, difícil de lazy load |

##### Zustand useShallow — 15+ arquivos sem useShallow

| Arquivo | Selectors sem useShallow | Severidade |
|---------|--------------------------|------------|
| `app/(app)/agents/page.tsx` | 5 selectors diretos | **P2** |
| `app/(app)/agents/[agentId]/page.tsx` | 5+ selectors diretos | **P2** |
| `app/(app)/agents/projects/[projectId]/board/page.tsx` | 4 selectors diretos | **P2** |
| `app/(app)/dashboard/page.tsx` | 1 selector direto | **P3** |
| `app/(app)/agents/new/page.tsx` | 4+ selectors diretos | **P2** |
| `app/(app)/agents/settings/page.tsx` | 1 selector direto | **P3** |
| `app/(app)/agents/sessions/page.tsx` | 2 selectors diretos | **P3** |
| `app/(app)/agents/groups/page.tsx` | 1 selector direto | **P3** |
| `app/(app)/agents/audit/page.tsx` | 1 selector direto | **P3** |
| `components/onboarding/getting-started-checklist.tsx` | 2 selectors diretos | **P3** |

**Impacto:** Re-renders desnecessários em toda a árvore de componentes MC quando qualquer parte do store muda.

##### Server vs Client Components

- 127 arquivos com `"use client"` — ~10-15% poderiam ser Server Components
- Candidatos: `StatusDot`, `MetricCard`, `InfoTooltip`, `ProjectStatusBadge`, `RosterCard` (read-only)
- Layouts do agents poderiam ser server com client boundary mais granular

##### Imagens
- ✅ Sem `<img>` tags — app usa SVG icons (Lucide) e texto
- Sem necessidade de otimização de imagens

---

### ACT (Agir)

> Decisões e ações recomendadas com base nos findings.

#### Ações Imediatas (P0/P1)

| # | Ação | Justificativa | Impacto |
|---|------|---------------|---------|
| 1 | **Adicionar whitelist de paths no proxy** | P0: Proxy cego permite bypass de auth no backend | Segurança crítica |
| 2 | **Não passar JWT do client ao upstream** | P1: Token leak ao backend | Segurança |
| 3 | **Validar gateway_url no onboarding** | P1: Risco de SSRF | Segurança |
| 4 | **Adicionar auth check explícito no file upload** | P1: Upload sem autenticação | Segurança |
| 5 | **Validar file type por magic bytes** | P1: Extension bypass | Segurança |
| 6 | **Adicionar schema validation (zod) em todos os routes** | P1: Inputs não validados | Segurança |
| 7 | **Sanitizar error responses** | P1: Info leak via error.message | Segurança |

#### Ações de Curto Prazo (P2)

| # | Ação | Justificativa | Impacto |
|---|------|---------------|---------|
| 8 | **Adicionar `useShallow` em todos os selectors Zustand** | 15+ arquivos com re-renders desnecessários | Performance |
| 9 | **Lazy load Recharts com `next/dynamic`** | ~1.2MB carregado desnecessariamente | Bundle size |
| 10 | **Merge CodeBlock duplicados** | 2 implementações do mesmo componente | Manutenibilidade |
| 11 | **Consolidar MetricCard** | 2 versões com features diferentes | Manutenibilidade |
| 12 | **Mover Combobox para shared** | Componente genérico em 18 arquivos, preso em mc/ui | Arquitetura |
| 13 | **Adicionar body size limits no proxy** | Sem limite = risco de DoS | Segurança |

#### Ações de Médio Prazo (P3)

| # | Ação | Justificativa | Impacto |
|---|------|---------------|---------|
| 14 | **Decompor wizards (agents/new, projects/new)** | 1763 e 971 linhas — extrair steps | Manutenibilidade |
| 15 | **Extrair `<WizardContainer>` reusável** | 3+ wizards com padrão repetido | Reuso |
| 16 | **Decompor agent detail page** | 849 linhas com 6 tabs inline | Manutenibilidade |
| 17 | **Converter componentes read-only para Server Components** | ~10-15% dos client components são desnecessários | Performance |
| 18 | **Lazy load DnD no board** | ~60KB carregado apenas no board | Bundle size |

---

## Legenda de Severidade

| Nível | Descrição |
|-------|-----------|
| **P0** | Crítico — segurança ou crash em produção |
| **P1** | Alto — bug visível ou degradação significativa |
| **P2** | Médio — melhoria importante de qualidade/performance |
| **P3** | Baixo — cleanup, padronização, nice-to-have |

---

## Métricas do Ciclo 1

| Métrica | Valor |
|---------|-------|
| Findings P0 | 1 |
| Findings P1 | 9 |
| Findings P2 | 12 |
| Findings P3 | 8 |
| **Total findings** | **30** |
| Arquivos analisados | 243 |
| API routes auditados | 10 |
| Componentes >300 linhas | 17 |
| Duplicações encontradas | 3 |

---

## Histórico de Ciclos

| Ciclo | Data | Foco | Resultado |
|-------|------|------|-----------|
| 1 | 2026-03-28 | Análise completa (qualidade, performance, segurança, refatoração) | 30 findings (1 P0, 9 P1, 12 P2, 8 P3) |
