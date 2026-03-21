# ADR 004 — Heartbeat Free-Tier Enforcement via Dedicated Provider

- **Status**: Accepted
- **Date**: 2026-03-21
- **Authors**: William Komori, Claude (co-authored)

## Contexto

O OpenClaw executa heartbeats periódicos por agente para manter sessões ativas e verificar
status. Por padrão, o heartbeat usa o mesmo modelo configurado em `agents.defaults.model`,
que pode ser um modelo pago (ex: `claude-opus-4-6`).

Com múltiplos agentes a 30s de frequência, o custo acumulado de heartbeats com modelos pagos
é significativo (~2.880 heartbeats/agente/dia). O objetivo é garantir que heartbeats **sempre**
usem modelos free, independente do modelo principal configurado.

### Restrições

- O código-fonte do OpenClaw **não pode ser modificado** — é uma dependência externa gerenciada,
  e mudanças seriam sobrescritas em atualizações.
- O `rikuchan-ai-gateway` é o único ponto de controle que podemos modificar.
- A solução deve ser configurável via `openclaw config set` sem nenhuma mudança de código.

## Decisão

Criar um provider dedicado `rikuchan-heartbeat` no config do OpenClaw com três propriedades:

1. **`baseUrl`**: aponta para o `rikuchan-ai-gateway` (mesmo endpoint dos outros providers)
2. **`headers: {"x-rikuchan-heartbeat": "true"}`**: header customizado que o gateway usa para
   identificar e enforçar roteamento free-tier
3. **`models`**: lista apenas modelos com `cost.input === 0 && cost.output === 0`

Apontar `agents.defaults.heartbeat.model` para `rikuchan-heartbeat/glm-4.7-flash`.

O `rikuchan-ai-gateway` detecta o header `x-rikuchan-heartbeat: true` e pode rejeitar
requests com custo > 0, garantindo enforcement no nível do gateway sem depender de config
correta no OpenClaw.

### Config resultante (openclaw)

```bash
openclaw config set models.providers.rikuchan-heartbeat '{
  "baseUrl": "https://rikuchan-ai-gateway-production.up.railway.app/v1",
  "api": "openai-completions",
  "apiKey": "<rk_live_key>",
  "headers": {"x-rikuchan-heartbeat": "true"},
  "models": [
    {"id": "glm-4.7-flash", "name": "GLM-4.7 Flash", ...},
    {"id": "qwen/qwen-2.5-72b-instruct", "name": "Qwen 2.5 72B Instruct", ...}
  ]
}'
openclaw config set agents.defaults.heartbeat.model "rikuchan-heartbeat/glm-4.7-flash"
```

### Filtro na Mission Control UI

`getFreeModelsFromConfig()` em `lib/mc/agent-files.ts` filtra `rikuchan-heartbeat` da lista
de modelos exibida no `HeartbeatModelSelector` e `FreeModelsCatalog` — evita que o provider
auxiliar apareça para seleção pelo usuário.

## Consequências

### Positivas

- **Zero code change no OpenClaw** — enforcement puramente via config + gateway
- **Isolamento explícito** — `rikuchan-heartbeat` é um provider separado, não mistura com
  providers de agentes
- **Double enforcement** — config lista só modelos free + gateway rejeita via header se necessário
- **Custo**: $0 (glm-4.7-flash e qwen-2.5-72b-instruct são free no gateway)
- **Observabilidade**: o header permite ao gateway logar e rastrear heartbeats separadamente

### Negativas

- Provider extra no config do OpenClaw (ruído visual no JSON)
- Se o gateway não implementar o enforcement do header, a garantia é só pela lista de modelos

## Alternativas Consideradas

### 1. Modificar heartbeat-runner.ts no OpenClaw

Rejeitada. O OpenClaw é dependência externa — mudanças são sobrescritas em atualizações.
Além disso, o usuário explicitou que o OpenClaw não deve ser modificado.

### 2. Usar o mesmo provider `rikuchan` com modelos free listados

Rejeitada. O modelo de heartbeat poderia ser trocado acidentalmente para um modelo pago pelo
usuário. O provider dedicado + header cria isolamento e enforcement explícito.

### 3. Enforçar free-tier apenas no gateway sem provider dedicado

Rejeitada. Sem um provider dedicado com header identificador, o gateway não consegue
distinguir chamadas de heartbeat de chamadas normais de agentes.
