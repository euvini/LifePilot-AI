import {
  BadGatewayException,
  GatewayTimeoutException,
  INestApplication,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { LLM_PORT, LlmPort } from '../src/ai/ports/llm.port.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { assertSafeTestDatabaseUrl } from './helpers/assert-safe-test-database-url.js';

describe('LifePilot API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const generateTaskSuggestionsMock =
    vi.fn<LlmPort['generateTaskSuggestions']>();
  const fakeLlmPort: LlmPort = {
    generateTaskSuggestions: generateTaskSuggestionsMock,
  };

  const defaultMockSuggestions = [
    {
      title: 'Contratar empresa de mudanças',
      description: 'Pedir 3 orçamentos',
      dueDate: '2026-11-20',
    },
    {
      title: 'Comprar caixas e fita adesiva',
      description: null,
      dueDate: null,
    },
  ];

  const validPlan = {
    title: 'Mudança para Lisboa',
    origin: 'Porto',
    destination: 'Lisboa',
    movingDate: '2026-12-01',
  };

  beforeEach(async () => {
    assertSafeTestDatabaseUrl(process.env.DATABASE_URL ?? '');
    generateTaskSuggestionsMock.mockResolvedValue(defaultMockSuggestions);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LLM_PORT)
      .useValue(fakeLlmPort)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.use((req: any, _res: any, next: () => void) => {
      const simulatedIp = req.headers?.['x-test-client-ip'];
      if (typeof simulatedIp === 'string' && simulatedIp.length > 0) {
        Object.defineProperty(req, 'ip', {
          value: simulatedIp,
          configurable: true,
        });
        if (req.socket) {
          Object.defineProperty(req.socket, 'remoteAddress', {
            value: simulatedIp,
            configurable: true,
          });
        }
      }
      next();
    });
    await app.init();

    prisma = app.get(PrismaService);
    assertSafeTestDatabaseUrl(process.env.DATABASE_URL ?? '');
    await prisma.movingPlan.deleteMany();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        service: 'lifepilot-api',
        timestamp: expect.any(String),
      });
    });
  });

  describe('POST /api/v1/moving-plans', () => {
    it('should create a moving plan with mapped dates', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/moving-plans')
        .send(validPlan)
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        title: validPlan.title,
        origin: validPlan.origin,
        destination: validPlan.destination,
        movingDate: '2026-12-01',
        createdAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        ),
        updatedAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        ),
      });
    });

    it('should reject a body with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/moving-plans')
        .send({ title: 'Incompleto' })
        .expect(400);
    });

    it('should reject a body with non-whitelisted properties', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/moving-plans')
        .send({
          ...validPlan,
          unexpectedField: 'not-allowed',
        })
        .expect(400);
    });

    it('should reject an invalid movingDate', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/moving-plans')
        .send({
          ...validPlan,
          movingDate: 'not-a-date',
        })
        .expect(400);
    });

    it('should reject an empty title', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/moving-plans')
        .send({
          ...validPlan,
          title: '',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/moving-plans', () => {
    it('should return an empty list when there are no plans', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/moving-plans')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should list created plans', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/moving-plans')
        .send(validPlan)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/moving-plans')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        ...validPlan,
        movingDate: '2026-12-01',
      });
      expect(response.body[0].createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(response.body[0].updatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });

  describe('GET /api/v1/moving-plans/:id', () => {
    it('should return a plan by id', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/moving-plans')
        .send(validPlan)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/moving-plans/${created.body.id}`)
        .expect(200);

      expect(response.body).toEqual(created.body);
      expect(response.body.movingDate).toBe('2026-12-01');
    });

    it('should return 404 for an unknown id', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/moving-plans/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.message).toBe('Plano de mudança não encontrado');
    });

    it('should reject invalid UUIDs in the path', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/moving-plans/not-a-uuid')
        .expect(400);
    });
  });

  describe('persistence', () => {
    it('should keep plans available after recreating the Nest application', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/moving-plans')
        .send(validPlan)
        .expect(201);

      await app.close();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(LLM_PORT)
        .useValue(fakeLlmPort)
        .compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.init();
      prisma = app.get(PrismaService);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/moving-plans/${created.body.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: created.body.id,
        ...validPlan,
        movingDate: '2026-12-01',
      });
    });
  });

  describe('moving-plans/:planId/tasks', () => {
    const validTask = {
      title: 'Embalar cozinha',
      description: 'Caixas frágeis',
      dueDate: '2026-11-15',
      status: 'TODO',
    };

    async function createPlan() {
      const response = await request(app.getHttpServer())
        .post('/api/v1/moving-plans')
        .send(validPlan)
        .expect(201);
      return response.body as { id: string };
    }

    it('should create, list, get, update and delete a task', async () => {
      const plan = await createPlan();

      const created = await request(app.getHttpServer())
        .post(`/api/v1/moving-plans/${plan.id}/tasks`)
        .send(validTask)
        .expect(201);

      expect(created.body).toEqual({
        id: expect.any(String),
        movingPlanId: plan.id,
        title: validTask.title,
        description: validTask.description,
        dueDate: '2026-11-15',
        status: 'TODO',
        createdAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        ),
        updatedAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        ),
      });

      const listed = await request(app.getHttpServer())
        .get(`/api/v1/moving-plans/${plan.id}/tasks`)
        .expect(200);
      expect(listed.body).toHaveLength(1);

      const fetched = await request(app.getHttpServer())
        .get(`/api/v1/moving-plans/${plan.id}/tasks/${created.body.id}`)
        .expect(200);
      expect(fetched.body).toEqual(created.body);

      const updated = await request(app.getHttpServer())
        .patch(`/api/v1/moving-plans/${plan.id}/tasks/${created.body.id}`)
        .send({
          status: 'IN_PROGRESS',
          description: null,
          dueDate: null,
        })
        .expect(200);

      expect(updated.body).toMatchObject({
        id: created.body.id,
        status: 'IN_PROGRESS',
        description: null,
        dueDate: null,
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/moving-plans/${plan.id}/tasks/${created.body.id}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/v1/moving-plans/${plan.id}/tasks/${created.body.id}`)
        .expect(404);
    });

    it('should reject invalid task payloads', async () => {
      const plan = await createPlan();

      await request(app.getHttpServer())
        .post(`/api/v1/moving-plans/${plan.id}/tasks`)
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/moving-plans/${plan.id}/tasks`)
        .send({ title: 'x', status: 'INVALID' })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/moving-plans/${plan.id}/tasks`)
        .send({ title: 'x', unexpectedField: true })
        .expect(400);

      const created = await request(app.getHttpServer())
        .post(`/api/v1/moving-plans/${plan.id}/tasks`)
        .send({ title: 'Embalar' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/moving-plans/${plan.id}/tasks/${created.body.id}`)
        .send({})
        .expect(400);
    });

    it('should return 404 for a missing plan', async () => {
      const missingPlanId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/v1/moving-plans/${missingPlanId}/tasks`)
        .expect(404)
        .expect(({ body }) => {
          expect(body.message).toBe('Plano de mudança não encontrado');
        });
    });

    it('should return 404 for a missing task', async () => {
      const plan = await createPlan();
      const missingTaskId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/moving-plans/${plan.id}/tasks/${missingTaskId}`)
        .expect(404);

      expect(response.body.message).toBe('Tarefa não encontrada');
    });

    it('should not allow cross-plan task access', async () => {
      const planA = await createPlan();
      const planB = await createPlan();

      const taskOnA = await request(app.getHttpServer())
        .post(`/api/v1/moving-plans/${planA.id}/tasks`)
        .send({ title: 'Só do plano A' })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/v1/moving-plans/${planB.id}/tasks/${taskOnA.body.id}`)
        .expect(404)
        .expect(({ body }) => {
          expect(body.message).toBe('Tarefa não encontrada');
        });

      await request(app.getHttpServer())
        .patch(`/api/v1/moving-plans/${planB.id}/tasks/${taskOnA.body.id}`)
        .send({ status: 'DONE' })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/v1/moving-plans/${planB.id}/tasks/${taskOnA.body.id}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/api/v1/moving-plans/${planA.id}/tasks/${taskOnA.body.id}`)
        .expect(200);
    });

    it('should reject invalid UUIDs in the path', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/moving-plans/not-a-uuid/tasks')
        .expect(400);

      const plan = await createPlan();
      await request(app.getHttpServer())
        .get(`/api/v1/moving-plans/${plan.id}/tasks/not-a-uuid`)
        .expect(400);
    });

    it('should cascade delete tasks when a moving plan is deleted', async () => {
      const plan = await createPlan();
      const created = await request(app.getHttpServer())
        .post(`/api/v1/moving-plans/${plan.id}/tasks`)
        .send(validTask)
        .expect(201);

      await prisma.movingPlan.delete({
        where: { id: plan.id },
      });

      const remainingTasks = await prisma.task.findMany({
        where: { id: created.body.id },
      });
      expect(remainingTasks).toHaveLength(0);
    });

    it('should persist tasks after recreating the Nest application', async () => {
      const plan = await createPlan();
      const created = await request(app.getHttpServer())
        .post(`/api/v1/moving-plans/${plan.id}/tasks`)
        .send(validTask)
        .expect(201);

      await app.close();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(LLM_PORT)
        .useValue(fakeLlmPort)
        .compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.init();
      prisma = app.get(PrismaService);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/moving-plans/${plan.id}/tasks/${created.body.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: created.body.id,
        movingPlanId: plan.id,
        title: validTask.title,
        dueDate: '2026-11-15',
        status: 'TODO',
      });
    });
  });

  describe('moving-plans/:planId/task-suggestions', () => {
    async function createPlan() {
      const response = await request(app.getHttpServer())
        .post('/api/v1/moving-plans')
        .send(validPlan)
        .expect(201);
      return response.body as { id: string };
    }

    describe('POST /api/v1/moving-plans/:planId/task-suggestions', () => {
      it('should generate suggestions preview without persisting any task in database', async () => {
        const plan = await createPlan();

        const response = await request(app.getHttpServer())
          .post(`/api/v1/moving-plans/${plan.id}/task-suggestions`)
          .send({ maxSuggestions: 5 })
          .expect(200);

        expect(response.body).toEqual({
          movingPlanId: plan.id,
          generatedAt: expect.any(String),
          suggestions: defaultMockSuggestions,
        });

        expect(generateTaskSuggestionsMock).toHaveBeenCalledWith({
          planTitle: validPlan.title,
          origin: validPlan.origin,
          destination: validPlan.destination,
          movingDate: validPlan.movingDate,
          maxSuggestions: 5,
        });

        const taskCount = await prisma.task.count({
          where: { movingPlanId: plan.id },
        });
        expect(taskCount).toBe(0);
      });

      it('should return 404 for a missing plan', async () => {
        const missingPlanId = '00000000-0000-0000-0000-000000000000';

        await request(app.getHttpServer())
          .post(`/api/v1/moving-plans/${missingPlanId}/task-suggestions`)
          .send({})
          .expect(404)
          .expect(({ body }) => {
            expect(body.message).toBe('Plano de mudança não encontrado');
          });
      });

      it('should reject invalid UUID in the path', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/moving-plans/not-a-uuid/task-suggestions')
          .send({})
          .expect(400);
      });

      it('should reject maxSuggestions greater than 20', async () => {
        const plan = await createPlan();

        await request(app.getHttpServer())
          .post(`/api/v1/moving-plans/${plan.id}/task-suggestions`)
          .send({ maxSuggestions: 25 })
          .expect(400);
      });

      it('should return 502 without stack traces when LLM provider fails', async () => {
        const plan = await createPlan();
        generateTaskSuggestionsMock.mockRejectedValueOnce(
          new BadGatewayException(
            'Falha na comunicação com o assistente de IA. Tente novamente.',
          ),
        );

        const response = await request(app.getHttpServer())
          .post(`/api/v1/moving-plans/${plan.id}/task-suggestions`)
          .send({})
          .expect(502);

        expect(response.body.message).toBe(
          'Falha na comunicação com o assistente de IA. Tente novamente.',
        );
        expect(response.body.stack).toBeUndefined();
      });

      it('should return 504 when LLM provider times out', async () => {
        const plan = await createPlan();
        generateTaskSuggestionsMock.mockRejectedValueOnce(
          new GatewayTimeoutException(
            'O provedor de IA demorou muito para responder. Tente novamente.',
          ),
        );

        const response = await request(app.getHttpServer())
          .post(`/api/v1/moving-plans/${plan.id}/task-suggestions`)
          .send({})
          .expect(504);

        expect(response.body.message).toBe(
          'O provedor de IA demorou muito para responder. Tente novamente.',
        );
      });

      it('should return 503 when LLM service is unavailable', async () => {
        const plan = await createPlan();
        generateTaskSuggestionsMock.mockRejectedValueOnce(
          new ServiceUnavailableException(
            'Serviço de sugestões de IA temporariamente indisponível.',
          ),
        );

        const response = await request(app.getHttpServer())
          .post(`/api/v1/moving-plans/${plan.id}/task-suggestions`)
          .send({})
          .expect(503);

        expect(response.body.message).toBe(
          'Serviço de sugestões de IA temporariamente indisponível.',
        );
      });

      describe('rate limiting (5 requests/minute per IP)', () => {
        it('should reject the 6th request with 429 even when X-Forwarded-For is forged or varied on each request', async () => {
          const plan = await createPlan();

          // 5 requests with 5 different forged X-Forwarded-For headers over the same connection
          for (let i = 1; i <= 5; i++) {
            await request(app.getHttpServer())
              .post(`/api/v1/moving-plans/${plan.id}/task-suggestions`)
              .set('X-Forwarded-For', `203.0.113.${i}`)
              .send({})
              .expect(200);
          }

          // 6th request with yet another forged X-Forwarded-For must be blocked by direct connection IP
          const response = await request(app.getHttpServer())
            .post(`/api/v1/moving-plans/${plan.id}/task-suggestions`)
            .set('X-Forwarded-For', '203.0.113.6')
            .send({})
            .expect(429);

          expect(response.body).toEqual({
            statusCode: 429,
            message:
              'Limite de requisições excedido. Tente novamente em instantes.',
          });
          expect(response.body.stack).toBeUndefined();
          expect(response.headers['retry-after']).toBeDefined();
        });

        it('should enforce rate limit isolation between different client connection IPs', async () => {
          const plan = await createPlan();
          const ipA = '198.51.100.10';
          const ipB = '198.51.100.20';

          for (let i = 0; i < 5; i++) {
            await request(app.getHttpServer())
              .post(`/api/v1/moving-plans/${plan.id}/task-suggestions`)
              .set('x-test-client-ip', ipA)
              .send({})
              .expect(200);
          }

          // 6th request from connection IP A must be blocked
          await request(app.getHttpServer())
            .post(`/api/v1/moving-plans/${plan.id}/task-suggestions`)
            .set('x-test-client-ip', ipA)
            .send({})
            .expect(429);

          // Request from connection IP B must succeed
          const responseIpB = await request(app.getHttpServer())
            .post(`/api/v1/moving-plans/${plan.id}/task-suggestions`)
            .set('x-test-client-ip', ipB)
            .send({})
            .expect(200);

          expect(responseIpB.body.suggestions).toBeDefined();
        });

        it('should not rate limit the accept endpoint even when the suggestions limit is reached for the same connection IP', async () => {
          const plan = await createPlan();
          const ip = '198.51.100.30';

          for (let i = 0; i < 5; i++) {
            await request(app.getHttpServer())
              .post(`/api/v1/moving-plans/${plan.id}/task-suggestions`)
              .set('x-test-client-ip', ip)
              .send({})
              .expect(200);
          }

          // Suggestions endpoint reaches limit
          await request(app.getHttpServer())
            .post(`/api/v1/moving-plans/${plan.id}/task-suggestions`)
            .set('x-test-client-ip', ip)
            .send({})
            .expect(429);

          // Accept endpoint must continue to succeed beyond 5 requests for the same connection IP
          for (let i = 0; i < 6; i++) {
            await request(app.getHttpServer())
              .post(`/api/v1/moving-plans/${plan.id}/task-suggestions/accept`)
              .set('x-test-client-ip', ip)
              .send({
                tasks: [{ title: `Tarefa aceita ${i + 1}` }],
              })
              .expect(201);
          }
        });

        it('should not rate limit CRUD endpoints when called repeatedly from the same connection IP', async () => {
          const plan = await createPlan();
          const ip = '198.51.100.40';

          for (let i = 0; i < 6; i++) {
            await request(app.getHttpServer())
              .get('/api/v1/moving-plans')
              .set('x-test-client-ip', ip)
              .expect(200);
          }

          for (let i = 0; i < 6; i++) {
            await request(app.getHttpServer())
              .get(`/api/v1/moving-plans/${plan.id}/tasks`)
              .set('x-test-client-ip', ip)
              .expect(200);
          }

          for (let i = 0; i < 6; i++) {
            await request(app.getHttpServer())
              .post('/api/v1/moving-plans')
              .set('x-test-client-ip', ip)
              .send({
                title: `Plano teste ${i + 1}`,
                origin: 'Origem',
                destination: 'Destino',
                movingDate: '2026-12-01',
              })
              .expect(201);
          }
        });
      });
    });

    describe('POST /api/v1/moving-plans/:planId/task-suggestions/accept', () => {
      const acceptedPayload = {
        tasks: [
          {
            title: 'Contratar empresa de mudanças',
            description: 'Pedir 3 orçamentos',
            dueDate: '2026-11-20',
          },
          {
            title: 'Comprar caixas e fita adesiva',
            description: null,
            dueDate: null,
          },
        ],
      };

      it('should accept and persist suggested tasks in PostgreSQL', async () => {
        const plan = await createPlan();

        const response = await request(app.getHttpServer())
          .post(`/api/v1/moving-plans/${plan.id}/task-suggestions/accept`)
          .send(acceptedPayload)
          .expect(201);

        expect(response.body).toHaveLength(2);
        expect(response.body[0]).toMatchObject({
          id: expect.any(String),
          movingPlanId: plan.id,
          title: 'Contratar empresa de mudanças',
          description: 'Pedir 3 orçamentos',
          dueDate: '2026-11-20',
          status: 'TODO',
        });
        expect(response.body[1]).toMatchObject({
          id: expect.any(String),
          movingPlanId: plan.id,
          title: 'Comprar caixas e fita adesiva',
          description: null,
          dueDate: null,
          status: 'TODO',
        });

        const listResponse = await request(app.getHttpServer())
          .get(`/api/v1/moving-plans/${plan.id}/tasks`)
          .expect(200);

        expect(listResponse.body).toHaveLength(2);
      });

      it('should return 404 when accepting suggestions for a missing plan', async () => {
        const missingPlanId = '00000000-0000-0000-0000-000000000000';

        await request(app.getHttpServer())
          .post(`/api/v1/moving-plans/${missingPlanId}/task-suggestions/accept`)
          .send(acceptedPayload)
          .expect(404);
      });

      it('should reject an empty tasks array with 400', async () => {
        const plan = await createPlan();

        await request(app.getHttpServer())
          .post(`/api/v1/moving-plans/${plan.id}/task-suggestions/accept`)
          .send({ tasks: [] })
          .expect(400);
      });

      it('should reject a tasks array exceeding 30 items with 400', async () => {
        const plan = await createPlan();
        const tooManyTasks = Array.from({ length: 31 }, (_, i) => ({
          title: `Tarefa ${i + 1}`,
        }));

        await request(app.getHttpServer())
          .post(`/api/v1/moving-plans/${plan.id}/task-suggestions/accept`)
          .send({ tasks: tooManyTasks })
          .expect(400);
      });

      it('should reject a task with invalid calendar date with 400', async () => {
        const plan = await createPlan();

        await request(app.getHttpServer())
          .post(`/api/v1/moving-plans/${plan.id}/task-suggestions/accept`)
          .send({
            tasks: [
              {
                title: 'Tarefa inválida',
                dueDate: '2026-02-31',
              },
            ],
          })
          .expect(400);
      });

      it('should reject a task with dueDate after the movingDate with 400', async () => {
        const plan = await createPlan();

        await request(app.getHttpServer())
          .post(`/api/v1/moving-plans/${plan.id}/task-suggestions/accept`)
          .send({
            tasks: [
              {
                title: 'Tarefa tardia',
                dueDate: '2026-12-05',
              },
            ],
          })
          .expect(400)
          .expect(({ body }) => {
            expect(body.message).toContain(
              'não pode ser posterior à data da mudança',
            );
          });
      });
    });
  });

  describe('unconfigured LLM_API_KEY integration', () => {
    it('boots normally, serves core endpoints, and returns 503 only when calling task-suggestions', async () => {
      const originalApiKey = process.env.LLM_API_KEY;
      delete process.env.LLM_API_KEY;

      const unmockedModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const unmockedApp = unmockedModule.createNestApplication();
      unmockedApp.setGlobalPrefix('api/v1');
      unmockedApp.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await unmockedApp.init();

      try {
        await request(unmockedApp.getHttpServer())
          .get('/api/v1/health')
          .expect(200);

        const planRes = await request(unmockedApp.getHttpServer())
          .post('/api/v1/moving-plans')
          .send(validPlan)
          .expect(201);

        const aiRes = await request(unmockedApp.getHttpServer())
          .post(`/api/v1/moving-plans/${planRes.body.id}/task-suggestions`)
          .send({})
          .expect(503);

        expect(aiRes.body.message).toBe(
          'Serviço de sugestões de IA temporariamente indisponível.',
        );

        await request(unmockedApp.getHttpServer())
          .post(
            `/api/v1/moving-plans/${planRes.body.id}/task-suggestions/accept`,
          )
          .send({
            tasks: [{ title: 'Tarefa aceita manualmente sem IA' }],
          })
          .expect(201);
      } finally {
        await unmockedApp.close();
        if (originalApiKey !== undefined) {
          process.env.LLM_API_KEY = originalApiKey;
        }
      }
    });
  });
});
