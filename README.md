# LifePilot AI

API NestJS (TypeScript, ESM) para planeamento pessoal assistido por IA. O primeiro caso de uso é organizar uma mudança de casa.

## Requisitos

- Node.js 24.x (testado com 24.20)
- npm 11+
- Docker e Docker Compose (PostgreSQL local)

## Configuração do ambiente

```bash
cp .env.example .env
```

Preencha `OBSERVE_APP_KEY` / `OBSERVE_APP_SECRET` se usar NestJS Observe (`npx @nestjs/observe link`).  
**Nunca faça commit de `.env` nem de credenciais reais.**

Variáveis relevantes (valores ilustrativos em `.env.example`):

| Variável | Uso |
|----------|-----|
| `PORT` | Porta HTTP (default `3000`) |
| `DATABASE_URL` | PostgreSQL da aplicação |
| `TEST_DATABASE_URL` | PostgreSQL isolado para e2e (nome da BD deve terminar em `_test`) |
| `OBSERVE_APP_KEY` / `OBSERVE_APP_SECRET` | Telemetria NestJS Observe |
| `LLM_API_KEY` | Chave da OpenAI para geração assistida de tarefas (opcional no boot, 503 se ausente ao chamar IA) |
| `LLM_MODEL` | Modelo OpenAI (default `gpt-4o-mini`) |
| `LLM_BASE_URL` | URL base do provedor (default `https://api.openai.com/v1`) |
| `LLM_TIMEOUT_MS` | Timeout da requisição de IA em milissegundos (default `15000`) |

## PostgreSQL local (Docker Compose)

```bash
npm run db:up
# equivale a: docker compose up -d
```

Isto sobe PostgreSQL 16 na porta **5433** do host (evita conflito com um Postgres local na 5432) e cria as bases `lifepilot` (app) e `lifepilot_test` (testes).

Parar:

```bash
npm run db:down
```

Para um serviço gerido no futuro, altere apenas `DATABASE_URL` (e `TEST_DATABASE_URL` no CI) — o schema Prisma permanece o mesmo.

## Prisma: generate e migrations

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init_moving_plans
```

Em ambientes já existentes / CI (sem prompts):

```bash
npm run prisma:migrate:deploy
```

Aplicar as migrations também à base de testes (obrigatório antes de `npm run test:e2e`):

```bash
npm run prisma:migrate:test
```

Este comando só corre se `TEST_DATABASE_URL` apontar para um host local e um nome de base terminado em `_test`.

## Instalar e iniciar a API

```bash
npm install
npm run db:up
npm run prisma:migrate:deploy
npm run start:dev
```

Prefixo global: `/api/v1`.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/moving-plans` | Criar plano |
| GET | `/api/v1/moving-plans` | Listar planos |
| GET | `/api/v1/moving-plans/:id` | Obter plano |
| GET | `/api/v1/moving-plans/:planId/tasks` | Listar tarefas do plano |
| POST | `/api/v1/moving-plans/:planId/tasks` | Criar tarefa |
| GET | `/api/v1/moving-plans/:planId/tasks/:taskId` | Obter tarefa |
| PATCH | `/api/v1/moving-plans/:planId/tasks/:taskId` | Atualizar tarefa |
| DELETE | `/api/v1/moving-plans/:planId/tasks/:taskId` | Eliminar tarefa (`204`) |
| POST | `/api/v1/moving-plans/:planId/task-suggestions` | Gerar prévia de sugestões com IA |
| POST | `/api/v1/moving-plans/:planId/task-suggestions/accept` | Aceitar e persistir lote de sugestões (`201`) |

### Tarefas

- `title` obrigatório (máx. 200); `description` opcional (máx. 2000).
- `dueDate` opcional no formato `YYYY-MM-DD`; timestamps em ISO-8601.
- `status`: `TODO` (default), `IN_PROGRESS` ou `DONE`.
- No PATCH, body vazio → `400`. `description` / `dueDate` com `null` limpam o campo.
- Tarefa inexistente ou de outro plano → `404` (`Tarefa não encontrada`).
- Plano inexistente nas rotas nested → `404` (`Plano de mudança não encontrado`).
- Eliminação de um plano remove em cascata todas as suas tarefas (cascade delete na base de dados).

### Sugestões de tarefas com IA (Fase 3)

- **Fluxo de revisão prévia:** A rota `POST /api/v1/moving-plans/:planId/task-suggestions` gera sugestões em memória via LLM (OpenAI `gpt-4o-mini`) com Structured Outputs, sem gravar no banco de dados.
- O body aceita `{ maxSuggestions?: number }` (default 10, min 1, máx 20).
- **Aceite em lote:** `POST /api/v1/moving-plans/:planId/task-suggestions/accept` recebe `{ tasks: [...] }` (mín. 1, máx. 30 tarefas), revalida todos os dados e grava o lote atomicamente via transação no PostgreSQL com status `TODO`.
- **Validação estrita de prazos:** Datas são validadas no formato real `YYYY-MM-DD` e nenhum prazo (`dueDate`) pode ser posterior à data da mudança (`movingDate`). Se não especificado, aceita-se `null`.
- **Proteção contra injeção e isolamento:** Dados do plano (título, origem, destino) são tratados como não confiáveis; a IA não possui ferramentas, acesso ao banco ou permissões de escrita.
- **Resiliência e tolerância:** Falta de `LLM_API_KEY` retorna `503` ao solicitar a funcionalidade sem impedir o boot da API. Timeouts (default 15s) retornam `504` e erros do provedor retornam `502` sem expor chaves, prompts internos ou stack traces.
- **Rate limiting e controle de requisições:**
  - O endpoint de geração com IA (`POST /api/v1/moving-plans/:planId/task-suggestions`) possui limitação estrita de **5 requisições por minuto por IP** via `@nestjs/throttler`.
  - Requisições além do limite recebem resposta HTTP `429 Too Many Requests` com mensagem padronizada (`Limite de requisições excedido. Tente novamente em instantes.`) sem expor detalhes internos.
  - A rota de aceite em lote (`POST /api/v1/moving-plans/:planId/task-suggestions/accept`) e as operações CRUD regulares (planos, tarefas e health check) não sofrem este rate limiting nesta etapa.
  - **Armazenamento em memória e limitações:**
    - O controle de taxa utiliza o storage padrão em memória (`ThrottlerStorageService`).
    - *Reinicialização da aplicação:* Qualquer reinício da aplicação limpa os contadores em memória, reiniciando o ciclo de contagem.
    - *Escalonamento horizontal:* Em cenários com múltiplos nós, pods ou réplicas atrás de um balanceador, cada instância mantém contadores locais independentes (não há sincronização entre processos). Para ambientes distribuídos com balanceamento de carga, recomenda-se a posterior adoção de backend compartilhado (como Redis).
    - *Rastreio e segurança de IP:* A identificação do cliente utiliza estritamente o endereço IP da ligação direta (`req.socket.remoteAddress` ou `req.ip` com `trust proxy` desativado) com normalização consistente de IPv4/IPv6. Para prevenir contorno por falsificação (spoofing) de IP, o cabeçalho `X-Forwarded-For` **não** é considerado nesta configuração. Esse cabeçalho só deve ser considerado futuramente caso seja explicitamente configurado um proxy reverso confiável (`trust proxy`).

## Testes

```bash
# Unitários (sem base de dados real; Prisma é mockado)
npm test

# E2E (exige Docker + TEST_DATABASE_URL apontando para *_test)
npm run db:up
# aplicar migrations na BD de teste (comando acima)
npm run test:e2e
```

Os e2e só limpam tabelas depois de validar que a URL é local e que o nome da base termina em `_test`.

## Build

```bash
npm run build
```

(`prebuild` executa `prisma generate`.)

## Observabilidade

Ver [NestJS Observe](https://observe.nestjs.com). Ligação local: `npx @nestjs/observe link`.

## Nota de segurança

Esta fase de desenvolvimento **não tem autenticação**. Não exponha a API publicamente sem autenticação e autorização adequadas.
