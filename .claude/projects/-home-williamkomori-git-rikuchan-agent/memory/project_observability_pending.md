---
name: Observability pending
description: rikuchan-web lacks structured logging, error handling, user feedback, and correlation IDs across all layers
type: project
---

Observabilidade em todos os níveis é uma pendência técnica identificada em 2026-03-23.

**Why:** Sessão de debugging de deletes/creates revelou que erros silenciosos, falta de logs server-side, e ausência de feedback no UI tornam problemas sistêmicos difíceis de diagnosticar. William observou um padrão repetido: persistência falhando sem visibilidade.

**How to apply:** Quando trabalhar no rikuchan-web, considerar este backlog:

### Camadas necessárias:
1. **Server-side logging** — structured logs com request ID em todas as API routes (`[MC API]` prefix)
2. **Correlation IDs** — request ID gerado no client, propagado via header, logado no server
3. **Error handling** — try-catch consistente em todos os store methods, com categorização (network, auth, permission, data)
4. **User feedback** — toast/notification para erros em operações CRUD, não só console.error
5. **Client-side error boundaries** — capturar crashes de componentes com fallback UI
6. **Supabase error tracking** — logar todos os erros do Supabase admin client

### Prioridade sugerida:
- P0: Toast/feedback para erros de CRUD (o usuário não vê nada hoje)
- P1: Structured logging nas API routes com request ID
- P2: Correlation IDs client→server
- P3: Error boundaries nos componentes MC
