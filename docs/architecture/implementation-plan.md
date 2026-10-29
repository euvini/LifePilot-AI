# LifePilot AI — Plano técnico e arquitetura (Fase 1)

**Status:** aguardando aprovação  
**Data:** 2026-10-28  
**Escopo desta fase:** análise e planejamento apenas — sem implementação

---

## 1. Resumo do estado atual

### Confirmações após inspeção do código

| Afirmação | Status |
|-----------|--------|
| Backend NestJS + TypeScript | Confirmado (`@nestjs/*` ^12, TypeScript ^6) |
| Projeto ESM | Confirmado (`"type": "module"`, imports com sufixo `.js`, `module: nodenext`) |
| Vitest para testes | Confirmado (`vitest.config.ts`, `vitest.config.e2e.ts`) |
| Prefixo global `/api/v1` | Confirmado em `src/main.ts` |
| `GET /api/v1/health` | Confirmado (`HealthModule` + `HealthController`) |
| Módulo `moving-plans` | Confirmado (controller, service, DTO, module) |
| CRUD parcial: create, list, get by id | Confirmado (`POST/GET /moving-plans`, `GET /moving-plans/:id`) |
| Validação com `class-validator` | Confirmado (`CreateMovingPlanDto` + `ValidationPipe` global) |
| Persistência em memória | Confirmado (`private readonly plans: MovingPlan[]`) |
| NestJS Observe conectado | Confirmado (`ObserveModule.forRoot` em `app.module.ts`; `.env` presente) |
| Fase inicial | Confirmado (sem Prisma/DB, sem IA, sem auth, README ainda é o starter Nest) |

### Estrutura atual

```
src/
  main.ts                 # bootstrap, prefixo api/v1, ValidationPipe
  app.module.ts           # Observe + Health + MovingPlans
  app.controller.ts       # GET / → "Hello World!" (legado do starter)
  app.service.ts
  health/
    health.module.ts
    health.controller.ts  # GET /health → { status, service, timestamp }
  moving-plans/
    moving-plans.module.ts
    moving-plans.controller.ts
    moving-plans.service.ts   # store em array + randomUUID
    dto/create-moving-plan.dto.ts
test/
  app.e2e-spec.ts         # testa GET / sem prefixo api/v1
```

### Dependências relevantes

**Runtime:** `@nestjs/common|core|platform-express`, `@nestjs/observe`, `class-validator`, `class-transformer`, `rxjs`, `reflect-metadata`.

**Ausentes (esperado nesta fase):** Prisma, PostgreSQL client, SDK de LLM, auth, config module formal.

### Modelo de domínio atual (implícito)

```ts
MovingPlan {
  id: string           // UUID
  title: string        // max 100
  origin: string       // max 200
  destination: string  // max 200
  movingDate: string   // ISO date string
  createdAt: string    // ISO datetime
}
```

Não há entidade `Task`, usuários, nem histórico de interações com IA.

### Endpoints efetivos (com prefixo)

| Método | Path | Comportamento |
|--------|------|---------------|
| GET | `/api/v1/` | Hello World (starter) |
| GET | `/api/v1/health` | health check estático |
| POST | `/api/v1/moving-plans` | cria plano em memória |
| GET | `/api/v1/moving-plans` | lista todos (sem paginação/filtro) |
| GET | `/api/v1/moving-plans/:id` | busca por id ou 404 |

---

## 2. Diagnóstico técnico

### Crítico

1. **Persistência volátil** — reinício do processo perde todos os planos. Bloqueia qualquer uso real e testes de integração confiáveis.
2. **Testes desalinhados com o bootstrap real** — o e2e cria a app sem `setGlobalPrefix('api/v1')` e sem `ValidationPipe`. O teste cobre `GET /`, não os endpoints de produto.
3. **Teste unitário do controller de moving-plans incompleto** — `MovingPlansController` depende de `MovingPlansService`, mas o spec não registra o provider/mock. Risco alto de falha ou de teste que não valida o contrato HTTP.
4. **Sem `.env.example`** — `.env` existe (Observe), mas não há contrato documentado de variáveis para onboarding e CI. (Não inspecionar/copiar valores de `.env`.)

### Importante

5. **Resíduo do starter Nest** — `AppController`/`AppService` e README genérico competem com a identidade do produto.
6. **Sem camada de configuração tipada** — `PORT`, `OBSERVE_*` lidos ad hoc; fallbacks `YOUR_APP_KEY`/`YOUR_APP_SECRET` mascaram misconfiguração em runtime.
7. **Health check superficial** — não verifica dependências futuras (DB). Adequado agora; precisará evoluir com Prisma.
8. **Sem autenticação / multi-tenant** — `findAll` retorna todos os planos. Aceitável para MVP local, mas deve ser decisão explícita antes de persistir em PostgreSQL compartilhado.
9. **Domínio incompleto para o caso de uso** — mudança de casa exige tarefas, status, prioridades e (depois) sugestões de IA; hoje só há o “envelope” do plano.
10. **Cobertura de testes fraca** — specs gerados pelo Nest (`should be defined`); service de planos não testa create/find/NotFound; e2e não cobre moving-plans nem validação de DTO.
11. **Formatação inconsistente** — indentação irregular em `main.ts` e linhas em branco extras em alguns arquivos (não bloqueante).

### Futuro

12. **Observabilidade de IA** — quando houver LLM, será necessário correlacionar custo, latência, prompt version e resultado validado com traces Observe.
13. **Versionamento de prompts / evals** — datasets de avaliação e regressão de qualidade das sugestões.
14. **Rate limiting, CORS, OpenAPI** — úteis antes de expor a API publicamente.
15. **Filas / workers** — só justificar se geração de planos for longa ou precisar de retry/idempotência; **não** introduzir agora.
16. **Frameworks de agentes** — evitar até existir orquestração multi-passo real com ferramentas; preferir serviços Nest + portas (interfaces).

---

## 3. Arquitetura proposta

### Princípios

- Manter um **monólito modular NestJS** (um deploy).
- Separar **API HTTP**, **domínio/casos de uso**, **persistência** e **integração com LLM**.
- IA como **adaptador**: regras de negócio e persistência nunca dependem de um vendor.
- Saída do modelo **sempre validada** (schema/DTO) antes de virar entidade.
- Complexidade incremental: primeiro CRUD estável + tarefas; depois um “planner” com LLM; só então agentes com ferramentas.

### Diagrama lógico

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP API (Nest Controllers)             │
│   /health  /moving-plans  /moving-plans/:id/tasks  /ai/...  │
└───────────────────────────┬─────────────────────────────────┘
                            │ DTOs + ValidationPipe
┌───────────────────────────▼─────────────────────────────────┐
│              Application / Domain Services                  │
│   MovingPlansService  TasksService  PlanGenerationService   │
│   (regras, orquestração de casos de uso, autorização)       │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
┌───────────────▼───────────────┐ ┌───────────▼────────────────┐
│ Persistence (Prisma)          │ │ AI Port (interface)        │
│ PrismaService + repositories  │ │ LlmClient / PlannerAgent   │
│ PostgreSQL                    │ │ + Output validators        │
└───────────────────────────────┘ └───────────┬────────────────┘
                                              │
                                  ┌───────────▼────────────────┐
                                  │ Adapter (OpenAI/Anthropic/ │
                                  │ outro) — trocável via DI   │
                                  └────────────────────────────┘
```

### Módulos Nest sugeridos (evolução)

| Módulo | Responsabilidade | Quando |
|--------|------------------|--------|
| `HealthModule` | Liveness/readiness | Já existe; evoluir readiness com DB |
| `MovingPlansModule` | Planos de mudança | Já existe; trocar store por Prisma |
| `TasksModule` *(ou nested em moving-plans)* | Tarefas do plano | Fase de domínio |
| `PrismaModule` | Cliente Prisma singleton | Persistência |
| `ConfigModule` (ou `@nestjs/config`) | Env tipado e validado | Junto com Prisma |
| `AiModule` | Porta LLM + validators + use cases de geração | Após CRUD estável |
| `AgentsModule` *(opcional, depois)* | Orquestração multi-agente e tools | Só com necessidade clara |

**Não criar agora:** microserviços, Redis, message broker, LangChain/CrewAI/etc. como dependência de framework.

### Separação agentes / tools / regras / HTTP

| Camada | Contém | Não contém |
|--------|--------|------------|
| Controllers | Roteamento, status HTTP, mapeamento DTO ↔ comando | Prompt engineering, SQL, chamada direta ao vendor |
| Domain services | Regras (status válidos, ownership, “tarefa pertence ao plano”) | SDK do LLM, detalhes Prisma além do necessário |
| AI agents (services) | Planejar prompts, chamar `LlmPort`, interpretar resposta | Persistir sem validação; expor chave |
| Tools | Funções tipadas (`createTask`, `listTasks`) invocáveis por agente | HTTP handlers |
| Adapters | Implementação concreta do `LlmPort` | Regras de negócio |

Contrato sugerido (conceitual):

```ts
interface LlmPort {
  complete(input: {
    system: string;
    user: string;
    // opcional: responseFormat / jsonSchema
  }): Promise<{ content: string; usage?: TokenUsage }>;
}
```

---

## 4. Modelo de dados inicial proposto

### Entidades

#### `MovingPlan`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID (PK) | |
| `title` | string(100) | |
| `origin` | string(200) | |
| `destination` | string(200) | |
| `movingDate` | `Date` (date) | hoje é string ISO; persistir como date |
| `status` | enum | `DRAFT` \| `ACTIVE` \| `COMPLETED` \| `ARCHIVED` |
| `notes` | text? | opcional, curto |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

> `userId` / ownership: **decisão pendente** (ver §8). Se single-user local, omitir na v1 do schema; se multi-user cedo, incluir `userId` desde a primeira migration.

#### `Task`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID (PK) | |
| `movingPlanId` | UUID (FK → MovingPlan, cascade delete) | |
| `title` | string(200) | |
| `description` | text? | |
| `status` | enum | `TODO` \| `IN_PROGRESS` \| `DONE` \| `CANCELLED` |
| `priority` | enum | `LOW` \| `MEDIUM` \| `HIGH` |
| `dueDate` | date? | |
| `sortOrder` | int | ordenação manual simples |
| `source` | enum | `USER` \| `AI_SUGGESTED` \| `AI_ACCEPTED` |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

#### Futuro próximo (não na primeira migration, mas reservar mentalmente)

- `AiGenerationRun` — auditoria de gerações (prompt version, model, tokens, raw response hash, status validação).
- `User` — quando houver auth.

### Relacionamentos

```
MovingPlan 1 ─── * Task
```

### Índices iniciais

- `Task(movingPlanId, sortOrder)`
- `Task(movingPlanId, status)`
- `MovingPlan(movingDate)` (opcional)

---

## 5. Estratégia de integração com IA e agentes

### Fase A — “Planner assistido” (recomendado primeiro)

Fluxo síncrono simples:

1. Cliente chama `POST /api/v1/moving-plans/:id/generate-tasks` (nome a definir).
2. Service carrega o plano do DB.
3. Monta prompt determinístico (template versionado em código ou arquivo).
4. Chama `LlmPort.complete`.
5. Faz parse JSON da resposta.
6. Valida com schema (ex.: `class-validator` DTO ou Zod **se aprovado** — ver §8).
7. Persiste tarefas com `source = AI_SUGGESTED` **ou** retorna preview para aceite humano (preferível).
8. Nunca persiste campos fora do schema validado.

**Sem filas** enquanto a latência for aceitável (< ~30s) e o volume for baixo.

### Fase B — Ferramentas (tools)

Quando o modelo precisar ler/escrever estado:

- Tools = métodos de domain services com input/output tipados.
- O “agente” é um service Nest que decide (via LLM ou regras) qual tool chamar — **não** um runtime externo obrigatório.
- Limitar tools: `listTasks`, `proposeTasks`, `updateTaskStatus`. Sem shell, sem SQL cru, sem HTTP arbitrário.

### Fase C — Orquestração multi-agente

Só após Fase A/B estáveis e métricas de qualidade:

- Agentes especializados (ex.: checklist doméstico, logística, documentação).
- Orquestrador com estado explícito (máquina de estados simples ou grafo linear).
- Avaliar então se um framework agrega valor; default continua sendo código Nest.

### Desacoplamento de vendor

- Interface `LlmPort` no domínio/application.
- Uma implementação adapter (ex. OpenAI Responses/Chat) atrás de DI.
- Env: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` — sem hardcode de vendor nos services de negócio.
- Timeouts, retries limitados e logging de usage via Observe (sem logar prompt completo com PII se não necessário).

### Validação da saída

- Schema estrito: lista de tarefas com `title`, `priority`, `dueDate?`.
- Rejeitar / truncar títulos longos; ignorar campos extras.
- Limite máximo de tarefas por geração (ex.: 30).
- Preferir “preview + accept” a escrita automática no DB.

---

## 6. Estratégia de testes

| Tipo | O quê | Como |
|------|-------|------|
| Unitário | Services de domínio, validators de saída IA, mappers | Vitest; mocks de `LlmPort` e Prisma |
| Integração | Controllers + ValidationPipe + Prisma | App Nest de teste com DB de teste (Docker Postgres ou Testcontainers — decisão §8) |
| E2E API | Fluxos HTTP reais com prefixo `/api/v1` | Corrigir bootstrap do e2e para espelhar `main.ts` |
| Avaliação IA (evals) | Qualidade/regressão de gerações | Fixtures de planos + golden/set de asserts estruturais (nº tarefas, campos obrigatórios, sem alucinação de datas inválidas); rodar em CI opcional com chave ou modo mock |

**Regra:** testes de negócio **não** chamam LLM real por padrão. Adapter real só em suite marcada (`evals` / nightly).

---

## 7. Plano de implementação em fases

### Fase 0 — Higiene e alinhamento de testes *(curta)*

| | |
|--|--|
| **Objetivo** | Garantir que testes refletem o app real; remover ruído do starter se aprovado |
| **Arquivos previstos** | `test/app.e2e-spec.ts`, `src/moving-plans/*.spec.ts`, opcionalmente remoção/ajuste de `app.controller*`; `.env.example` |
| **Dependências** | Nenhuma nova |
| **Testes** | E2E: health + moving-plans create/list/get; unit: create/find/NotFound no service |
| **Critérios de aceite** | `npm test` e `npm run test:e2e` passam; e2e usa prefixo `/api/v1` e ValidationPipe; nenhum segredo commitado |

### Fase 1 — Configuração e PostgreSQL + Prisma

| | |
|--|--|
| **Objetivo** | Persistência real dos planos existentes |
| **Arquivos previstos** | `prisma/schema.prisma`, `prisma/migrations/*`, `src/prisma/prisma.module.ts`, `src/prisma/prisma.service.ts`, refactor de `moving-plans.service.ts`, `.env.example` (`DATABASE_URL`), opcional `@nestjs/config` |
| **Dependências** | `prisma`, `@prisma/client`; (opcional) `@nestjs/config` |
| **Testes** | Integração create/list/get contra Postgres de teste; health readiness opcional |
| **Critérios de aceite** | Reiniciar app preserva planos; migration aplica limpa; service sem array em memória; `.env.example` documenta `DATABASE_URL` e Observe sem valores secretos |

### Fase 2 — Domínio de tarefas

| | |
|--|--|
| **Objetivo** | CRUD de tarefas ligadas a um plano |
| **Arquivos previstos** | models Prisma `Task`, DTOs, `tasks.controller/service` (ou rotas nested), migration |
| **Dependências** | Nenhuma além das da Fase 1 |
| **Testes** | Unit + e2e: criar tarefa no plano, listar, atualizar status, 404 se plano inexistente |
| **Critérios de aceite** | API permite gerenciar checklist de mudança; cascade delete documentado; validação de enums |

### Fase 3 — Porta de LLM + geração assistida de tarefas

| | |
|--|--|
| **Objetivo** | Gerar sugestões de tarefas a partir do plano, com validação |
| **Arquivos previstos** | `src/ai/llm.port.ts`, `src/ai/*adapter*.ts`, `src/ai/plan-task-generator.service.ts`, DTOs de output, endpoint de generate/preview/accept |
| **Dependências** | SDK do provider escolhido **ou** `fetch` HTTP direto (preferir menos deps se suficiente) |
| **Testes** | Unit com `LlmPort` fake; testes de validator; e2e com fake provider via DI override |
| **Critérios de aceite** | Trocar adapter não altera domain service; saída inválida do modelo não grava lixo; secrets só via env |

### Fase 4 — Aceite humano, auditoria leve e observabilidade de IA

| | |
|--|--|
| **Objetivo** | Preview/accept, registrar runs, correlacionar com Observe |
| **Arquivos previstos** | entidade/tabela `AiGenerationRun` (ou log estruturado), endpoints accept, instrumentação |
| **Dependências** | Avaliar necessidade; evitar fila |
| **Testes** | Fluxo preview → accept; rejeição; métricas/logs sem PII desnecessária |
| **Critérios de aceite** | Sugestões AI não viram `DONE` sozinhas; dá para auditar última geração por plano |

### Fase 5 — Tools e orquestração simples *(só se necessário)*

| | |
|--|--|
| **Objetivo** | Agente que usa tools tipadas para refinar o plano |
| **Arquivos previstos** | `src/ai/tools/*`, orquestrador com loop limitado (max N steps) |
| **Dependências** | Justificar framework externo antes de adicionar |
| **Testes** | Loop com fake LLM que emite tool calls; limite de steps; tools não escapam do domínio |
| **Critérios de aceite** | Max steps enforced; tools só via allowlist; sem microserviços/filas sem justificativa escrita |

---

## 8. Decisões que exigem sua aprovação

1. **Autenticação na v1** — single-user local (sem auth) vs. API key simples vs. JWT/usuários desde já?
2. **Hospedagem do Postgres** — local Docker Compose vs. managed (Neon, RDS, etc.)?
3. **Estratégia de DB de teste** — Postgres em Docker no CI vs. Testcontainers vs. só unit com mock do Prisma no curto prazo?
4. **Incluir `userId` na primeira migration** ou adiar?
5. **Fluxo de IA** — persistir sugestões automaticamente (`AI_SUGGESTED`) vs. preview + accept obrigatório?
6. **Provider de LLM inicial** — qual vendor/modelo? Orçamento e região?
7. **Validação de schema de saída da IA** — manter só `class-validator` vs. introduzir Zod (nova dependência)?
8. **Introduzir `@nestjs/config`** agora ou ler `process.env` com validação manual mínima?
9. **Remover endpoint Hello World / AppController** nesta limpeza inicial?
10. **Nome e forma do endpoint de geração** — nested resource vs. módulo `ai` separado?
11. **OpenAPI / Swagger** nesta etapa ou depois?
12. **Idioma dos prompts e conteúdo gerado** — português como default?

---

## 9. Dependências externas e credenciais (sem valores)

| Item | Uso | Onde |
|------|-----|------|
| `OBSERVE_APP_KEY` / `OBSERVE_APP_SECRET` | Telemetria Nest Observe | já referenciados; `.env` gitignored |
| `DATABASE_URL` | PostgreSQL / Prisma | a criar |
| `PORT` | HTTP listen | opcional (default 3000) |
| `LLM_API_KEY` (+ provider/model) | Chamadas ao modelo | a criar na Fase 3 |
| Docker (recomendado) | Postgres local/CI | a decidir |

**Política:** nunca commitar `.env`; manter `.env.example` só com chaves e placeholders.

---

## 10. Primeira tarefa concreta recomendada (agente de implementação)

Após aprovação deste plano e das decisões mínimas da §8:

> **Fase 0 — Alinhar testes ao bootstrap real e cobrir `moving-plans` sem mudar persistência.**

Passos objetivos:

1. Ajustar `test/app.e2e-spec.ts` para aplicar `setGlobalPrefix('api/v1')` e o mesmo `ValidationPipe` de `main.ts`.
2. Adicionar casos e2e: `GET /api/v1/health`, `POST/GET /api/v1/moving-plans`, `GET` por id e 404.
3. Corrigir `moving-plans.controller.spec.ts` com mock do service; expandir `moving-plans.service.spec.ts` (create, findAll, findOne, NotFound).
4. Criar `.env.example` com placeholders (`PORT`, `OBSERVE_APP_KEY`, `OBSERVE_APP_SECRET`) sem segredos.
5. (Opcional, se aprovado) remover ou desativar `AppController` Hello World e atualizar README mínimo do produto.

**Critério de pronto:** `npm test` e `npm run test:e2e` verdes; comportamento de API documentado pelo e2e; nenhuma mudança de stack ainda.

Em seguida, com `DATABASE_URL` e escolha de Postgres aprovados, iniciar **Fase 1 (Prisma)**.

---

## 11. Fora de escopo explícito (até nova aprovação)

- Microserviços
- Redis / filas / workers
- Frameworks de agentes como dependência padrão
- Frontend
- Auth complexa / OAuth (salvo decisão contrária na §8)
- Implementação de qualquer fase acima sem autorização

---

**Próximo passo:** revisar este documento, responder às decisões da §8 (mesmo que parcial) e autorizar a **Fase 0** para o agente de implementação.
