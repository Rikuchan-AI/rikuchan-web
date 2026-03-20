# ADR 002 — Groups-First Project Architecture

- **Status**: Accepted
- **Date**: 2026-03-20
- **Authors**: William Komori, Claude (co-authored)
- **Deciders**: William Komori

## Context

Mission Control organizes work into Projects (task boards with agents) and Groups (organizational containers with gateway connections). Previously, groups were optional and managed inline on the Projects page. Projects could exist without a group.

This created confusion:
- Gateway connection was configured per-group, but projects without groups had no clear gateway
- Each group creates an agent in OpenClaw, and projects use sessions from that agent
- Having group creation inline on the Projects page mixed two concerns

## Decision

### Groups are now required for projects

- Every project must belong to a group (`groupId` is required)
- Group creation is exclusively on the dedicated `/agents/groups` page
- The "New Group" button and inline form were removed from the Projects page
- When no groups exist, the "New Project" button is replaced with "Create a Group first" linking to `/agents/groups`

### Dedicated Groups page

A new page at `/agents/groups` provides full group management:
- Create groups with name, description, gateway URL, and token
- Saved gateway reuse: existing gateway URLs from other groups appear as quick-select chips and in a datalist dropdown
- Inline editing of group name and description
- Delete with cascade (unlinks projects)
- GroupCard shows project count, agent ID badge, gateway URL

### Agent creation on group creation

When a group is created and the gateway is connected, an agent is automatically created in OpenClaw via WebSocket RPC (`agents.create`). The agent ID is stored on the group. Projects in that group use sessions from this agent.

### Sidebar navigation

"Groups" was added to the MC sidebar between "Projects" and "Chat", reflecting its importance in the hierarchy: Groups > Projects > Tasks.

## Consequences

- Projects can no longer be created without first creating a group
- Existing ungrouped projects are still displayed in an "Ungrouped" section
- Gateway configuration is centralized at the group level, not scattered across projects
- The flow is: Create Group (with gateway) -> Group creates Agent -> Create Project in Group -> Project uses Group's Agent sessions

## Files Changed

| File | Change |
|------|--------|
| `app/(app)/agents/groups/page.tsx` | New dedicated Groups page with CRUD |
| `app/(app)/agents/projects/page.tsx` | Removed group creation, require group for new project |
| `components/dashboard/dashboard-sidebar.tsx` | Added "Groups" link |
| `lib/mc/agent-files.ts` | Fixed RPC ID registration for all WebSocket calls |
| `lib/mc/direct-chat-store.ts` | Added `setConversationModel` |
