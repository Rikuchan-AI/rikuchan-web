# ADR 003 — Mission Control UI/UX Audit: Gap Analysis & Targeted Fixes

- **Status**: Accepted
- **Date**: 2026-03-20
- **Authors**: William Komori, Claude (co-authored)
- **Deciders**: William Komori

## Context

A full UI/UX audit of the Mission Control dashboard was conducted covering 7 screenshots, a 4-minute session video, and navigation GIF. The audit identified 5 problem areas: weak visual hierarchy, dark-on-dark surfaces, empty states without purpose, low information density, and inconsistency between marketing site and app.

The audit produced 20 improvement items across 12 sections (Sidebar, Header, Agents, Projects, Board, Chat, Model Selector, Analytics, Gateway, Design System, Landing Bridge, Priority Matrix).

## Finding

Most high-priority items from the audit were **already implemented** at time of review:

| Area | Finding | Status |
|------|---------|--------|
| Sidebar | Icons, active border-left, collapsible sections, localStorage persistence | ✅ Already done |
| Sidebar | Inline badges (agents online, sessions count, gateway dot) | ✅ Already done |
| Header | Dynamic breadcrumbs with clickable links | ✅ Already done |
| Surface hierarchy | Full CSS variable system (5 levels) | ✅ Already done |
| Agent cards | Status border color, current task, metrics, heartbeat, action buttons | ✅ Already done |
| Status badges | Per-status bg/text/border colors (emerald/zinc/amber/red) | ✅ Already done |
| Gateway panel | Collapsible: expands when disconnected, collapses when connected | ✅ Already done |
| Board columns | Color-coded top borders, per-column `+` button, drag & drop | ✅ Already done |
| Chat | Model header, RAG badge, latency badge (green/amber/red), copy button | ✅ Already done |
| Model selector | Grouped by provider (optgroup), persisted per conversation | ✅ Already done |
| Typography scale | `.text-page-title`, `.text-section-title`, `.text-card-title`, `.text-metric` in globals.css | ✅ Already done |
| Animations | shimmer, fadeIn, slideIn, heartbeat, live-pulse, card-hover | ✅ Already done |
| Empty states | `EmptyState` component with icon, title, description, CTA | ✅ Already done |
| Toast notifications | `toast()` helper via `components/shared/toast.tsx` | ✅ Already done |

**True gaps identified (5 items):**

1. `ProjectCard` displayed raw `workspacePath` (e.g. `/data/.openclaw/projects/f564b40b...`) — debug-level info exposed in production UI
2. `ProjectCard` `taskCount` type missing `blocked` field — cards showed BKL/PRG/REV/DNE but never BLK even when tasks were blocked
3. `DashboardShell` "Invite teammate" button linked to `/signup` — wrong destination, implied user was not signed in
4. `BoardHeader` mode toggle (Manual/Supervised/Autonomous) had no tooltip — no affordance explaining what each mode does
5. `DashboardSidebar` workspace card occupied ~100px with a static description paragraph — wasted vertical space

## Decision

Fix the 5 confirmed gaps. Do not re-implement what already works.

### ProjectCard: remove workspacePath display

The path is an internal file system detail. It is not useful to users and leaks implementation details (local vs cloud path). Removed the `<p>` block. The workspace path remains in the data model for agent use — only the UI display is removed.

### ProjectCard: add blocked count to taskCount

`taskCount` type extended with optional `blocked?: number`. The field is optional to maintain backward compatibility with projects that predate this field. The BLK pill only renders when `blocked > 0` — zero-blocked projects are unchanged visually. Color: `var(--danger)` (red-400), consistent with blocked task column color.

### DashboardShell: remove "Invite teammate" button

The button linked to `/signup` which is the public registration page, not an invite flow. No invite system exists in the product yet. Removed entirely to avoid confusion. When an invite flow is built, a proper button can be added at that time.

### BoardHeader: mode toggle tooltips

Added `title` attribute to each mode button:
- Manual: `"Every action requires human approval"`
- Supervised: `"Agents execute, human reviews transitions"`
- Autonomous: `"Lead agent delegates without approval"`

Native browser tooltip on hover. No new dependency or overlay needed.

### DashboardSidebar: workspace card simplification

Replaced the `p-4` card with description paragraph with a single inline row:
```
● Rikuchan Starter
```
Green dot + workspace name. Saves ~80px of vertical space. The description "Operational area for API access, billing, and workspace controls" added no information not already in the sidebar navigation itself.

## Consequences

- No visual regressions on items already working
- ProjectCard is cleaner — path removed, blocked count surfaces when relevant
- Board mode toggle is self-documenting via tooltip
- Sidebar gains ~80px of vertical space on compact screens
- "Invite teammate" confusion eliminated until proper invite flow exists
