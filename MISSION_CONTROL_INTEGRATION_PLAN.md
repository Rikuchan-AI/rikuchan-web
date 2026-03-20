# Mission Control Integration into rikuchan-web

## Context

Mission Control (`~/git/rikuchan-mission-control`) is a standalone Next.js app for OpenClaw agent orchestration. It needs to become a module inside `rikuchan-web` under `/agents/*` so customers get a unified experience: dashboard metrics + agent management in one shell.

**Key finding**: Both projects share **identical** design systems, Clerk auth, Supabase, Next.js 16, React 19, Tailwind v4. The integration is a file reorganization, not a redesign.

**Strategy**: Copy & Adapt — copy MC's lib/, components/, and pages into rikuchan-web under namespaced directories (`lib/mc/`, `components/mc/`, `app/(app)/agents/`). Discard MC's layout shell in favor of web's DashboardShell.

---

## Route Structure

All MC functionality lives under `/agents/*`. Three first-level sidebar sections: Dashboard, Agents (MC), Settings.

```
app/(app)/
  layout.tsx          ← auth.protect() + DashboardShell (NO GatewayProvider)
  dashboard/
    layout.tsx        ← pass-through
    page.tsx, analytics/, api-keys/, billing/, plans/, settings/
  agents/
    layout.tsx        ← 'use client' + GatewayProvider (WebSocket, Zustand stores)
    page.tsx          ← agent explorer grid + gateway status
    [agentId]/page.tsx
    new/page.tsx
    projects/
      page.tsx
      new/page.tsx
      [projectId]/
        layout.tsx    ← project tabs
        page.tsx
        board/page.tsx  ← kanban with DnD
        pipeline/page.tsx
        agents/page.tsx
        memory/page.tsx
        settings/page.tsx
    sessions/
      page.tsx
      [sessionId]/page.tsx
    gateway/
      page.tsx        ← config, logs, heartbeat
    settings/
      page.tsx        ← lead agent model, heartbeat config
  settings/
    page.tsx          ← API keys, providers (existing)
    billing/page.tsx
```

**Sidebar**:
```
── Platform ──────────
  Overview          /dashboard
  Analytics         /dashboard/analytics
  API keys          /dashboard/api-keys
  Billing           /dashboard/billing
  Plans             /dashboard/plans
  Settings          /dashboard/settings

── Mission Control ── (collapsible, hidden when feature flag off)
  Agents     (3)    /agents
  Projects   (2)    /agents/projects
  Sessions   (1)    /agents/sessions
  Gateway    ●      /agents/gateway
  MC Settings       /agents/settings
```

---

## Key Architecture Decisions

### 1. GatewayProvider scoped to `agents/layout.tsx`

NOT at `(app)/layout.tsx`. Users who only use dashboard never load Zustand stores, WebSocket, or MC hydration.

```tsx
// app/(app)/agents/layout.tsx
'use client'
import { GatewayProvider } from '@/components/mc/providers/GatewayProvider'

export default function AgentsLayout({ children }) {
  return <GatewayProvider>{children}</GatewayProvider>
}
```

Consequences:
- `CommandPalette` (Cmd+K) only works inside `/agents/*`
- `DisconnectedOverlay` scoped to `/agents/*`
- Gateway status dot in sidebar: gray when outside `/agents/*`, live when provider mounted
- Sidebar badges (agent/session counts): show cached values from localStorage outside `/agents/*`

### 2. State Management Boundary

```
MC module (lib/mc/, components/mc/, agents/*): Zustand stores
Dashboard module (dashboard/*): Server Components + direct fetch
```

**Rule**: Stores from `lib/mc/` are NEVER imported outside `components/mc/` and `app/(app)/agents/`. The GatewayProvider is the boundary.

rikuchan-web currently uses no client state manager (server components + `gatewayFetch`). Zustand is exclusive to MC.

### 3. Feature Flag

```env
NEXT_PUBLIC_MC_ENABLED=true
```

Applied in:
- Sidebar: MC section rendered conditionally
- `agents/layout.tsx`: redirects to `/dashboard` if flag is off
- Allows incremental rollout and safe deploys

### 4. Auth Guard

Currently at `(app)/dashboard/layout.tsx`. Need to verify if all routes under `(app)` require auth before promoting to `(app)/layout.tsx`. If yes, promote. If not, add separate guard in `agents/layout.tsx`.

---

## File Placement

### Lib → `lib/mc/`

| MC Source | Lines |
|-----------|-------|
| `gateway-store.ts` | 1069 |
| `projects-store.ts` | 389 |
| `chat-store.ts` | 203 |
| `notifications-store.ts` | 116 |
| `types.ts` + `types-project.ts` + `types-chat.ts` | 543 |
| `em-delegation.ts` | 400 |
| `em-chat.ts` | 178 |
| `auto-resolve.ts` | 183 |
| `agent-files.ts` | 434 |
| `heartbeat-integration.ts` | 347 |
| `models.ts` + `free-models.ts` + `cost-tracking.ts` | 289 |
| `mock-gateway.ts` | 363 |
| `gateway-api.ts` | 71 |
| `storage/` (adapters) | ~200 |
| `auth-provider.tsx`, `supabase-server.ts`, utils | ~100 |

### Components → `components/mc/`

38 components (discarding AppShell, Sidebar, TopBar):
- `mc/agents/` — AgentGrid, AgentCard, AgentStatusBadge, AgentSessionList
- `mc/projects/` — ProjectCard, TaskCard, RosterCard, etc.
- `mc/board/` — TaskDrawer, TaskActions, TaskChatPanel, BlockedAlert
- `mc/chat/` — ChatBubble, EMChatSheet
- `mc/sessions/` — SessionCard, SessionStream, MessageBubble
- `mc/gateway/` — GatewayStatus, GatewayLogs, ConnectionSetup
- `mc/settings/` — HeartbeatModelSelector, LeadBoardAgentSelector
- `mc/ui/` — CodeBlock, LivePulse, MetricCard, StatusDot
- `mc/` — CommandPalette, NotificationCenter, ClientRenderGate

### Discard (replaced by web's shell)

- `components/layout/{AppShell,Sidebar,TopBar}` → web's DashboardShell
- `app/layout.tsx`, `middleware.ts`, `app/globals.css` → web's versions
- `app/login/`, `app/signup/`, `app/api-keys/`, `app/billing/` → already in web
- `lib/clerk.ts` → already in web

### API Routes to Copy

- `app/api/mc/[...path]/route.ts` — Supabase CRUD proxy (253 lines)
- `app/api/gateway/config/route.ts` — OpenClaw config auto-detection
- `app/api/models/free/route.ts` — free model catalog

### CSS Token Merge

Append to web's `globals.css` (no conflicts):
- Status: `--status-online/idle/thinking/degraded/offline`
- Tasks: `--task-backlog/progress/review/blocked/done`
- Projects: `--project-active/paused/archived`
- Pipeline: `--step-pending/running/success/failed/skipped`
- Animations: `live-pulse`, `heartbeat-pulse` keyframes
- Scrollbar styles

### Dependencies to Add

```
zustand ^5.0.12, @hello-pangea/dnd ^18.0.1, react-markdown ^10.1.0,
jszip ^3.10.1, @supabase/supabase-js ^2.99.3
```

---

## Import Path Migration

All copied files: `@/lib/X` → `@/lib/mc/X`, `@/components/X/` → `@/components/mc/X/`

Key redirects:
- `@/components/layout/AppShell` → DELETE (unwrap from pages)
- `@/components/ui/Toast` → `@/components/shared/toast`
- `@/components/shared/RikuLoader` → `@/components/shared/riku-loader`

Page refactoring: strip `<AppShell>` wrapper and `p-6` padding (DashboardShell provides it).

---

## Phased Implementation

### Phase 0: Foundation
- Install deps
- Merge MC CSS tokens into web's `globals.css`
- Run Supabase migration SQL (`mc_*` tables)
- Add env vars (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`)

### Phase 0.5: Feature Flag
- Add `NEXT_PUBLIC_MC_ENABLED` env var
- Sidebar renders MC section conditionally
- `agents/layout.tsx` redirects if flag off
- Deploy with flag=false, validate dashboard unchanged

### Phase 1: Core Library
- Create `lib/mc/` directory
- Copy all MC lib files with import path updates
- Copy hooks, storage adapters
- Verify `npx tsc --noEmit`

### Phase 2: API Routes
- Copy `app/api/mc/[...path]/route.ts`
- Copy `app/api/gateway/config/route.ts`
- Copy `app/api/models/free/route.ts`

### Phase 3: Components
- Create `components/mc/` structure
- Copy 38 domain components
- Merge shared components (RikuLoader variants, toast)
- Import path transformation

### Phase 4: Layout & Navigation
- Verify auth guard scope, promote to `(app)/layout.tsx` if safe
- Create `GatewayProvider` in `agents/layout.tsx` (extracted from AppShell)
- Update sidebar with MC section (collapsible, feature-flagged, badges)

### Phase 5: Agent Routes
- `/agents` (explorer grid)
- `/agents/[agentId]` (detail)
- `/agents/new` (create)

### Phase 6: Project Routes
- `/agents/projects` (list + create)
- `/agents/projects/[projectId]/*` (board, pipeline, memory, agents, settings)
- Kanban DnD

### Phase 7: Sessions & Gateway
- `/agents/sessions/*`
- `/agents/gateway`
- `/agents/settings`

### Phase 8: Dashboard Enrichment
- Add MC widgets to `/dashboard` (agent grid, recent tasks, activity) when gateway connected

### Phase 8.5: Smoke Tests
- 10 Playwright tests: sidebar, navigation, page loads, DnD, feature flag on/off
- `npx tsc --noEmit` in CI
- Bundle size comparison before/after

### Phase 9: Polish
- Responsive testing, mobile nav
- WebSocket lifecycle (connect/disconnect/reconnect)
- Command palette
- Error boundaries

---

## Decisions in Aberto

1. **Gateway status badge outside `/agents/*`**: GatewayProvider not mounted → no store access. Options: (a) gray dot always, (b) lightweight health check via fetch, (c) cache last status in localStorage. Define before Phase 4.

2. **Auth guard promotion**: Verify all `(app)` routes need auth before promoting from `dashboard/layout.tsx` to `(app)/layout.tsx`. If some are public, keep separate guards.

3. **Toast system merge**: MC uses global `toast()`, web uses context-based `ToastProvider`. Options: (a) mount MC's ToastContainer in GatewayProvider, (b) adapt MC's calls to web's context. Decide in Phase 3.

---

## Verification

1. **Phase 1**: `npx tsc --noEmit` — all MC lib files compile
2. **Phase 0.5**: Deploy with MC_ENABLED=false — dashboard works normally
3. **Phase 4**: Navigate `/dashboard` ↔ `/agents` — sidebar correct, no flash
4. **Phase 5**: `/agents` shows grid (mock gateway)
5. **Phase 6**: `/agents/projects/[id]/board` — DnD works
6. **Phase 7**: `/agents/gateway` — WebSocket connects, logs stream
7. **Phase 8.5**: All 10 smoke tests pass
8. **Phase 9**: Full flow: login → dashboard → agents → project → board → task
