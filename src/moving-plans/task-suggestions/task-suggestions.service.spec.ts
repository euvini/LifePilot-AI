import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LLM_PORT, LlmPort } from '../../ai/ports/llm.port.js';
import { TaskStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TaskSuggestionsService } from './task-suggestions.service.js';
import { TaskSuggestionsValidator } from './task-suggestions.validator.js';

describe('TaskSuggestionsService', () => {
  let service: TaskSuggestionsService;

  const planId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const missingPlanId = '00000000-0000-0000-0000-000000000000';

  const planRecord = {
    id: planId,
    title: 'Mudança para Lisboa',
    origin: 'Porto',
    destination: 'Lisboa',
    movingDate: new Date('2026-12-01T00:00:00.000Z'),
    createdAt: new Date('2026-10-28T12:00:00.000Z'),
    updatedAt: new Date('2026-10-28T12:00:00.000Z'),
  };

  const rawSuggestions = [
    {
      title: 'Contratar empresa de mudanças',
      description: 'Pedir orçamentos',
      dueDate: '2026-11-15',
    },
    {
      title: 'Comprar caixas',
      description: null,
      dueDate: null,
    },
  ];

  const generateTaskSuggestionsMock =
    vi.fn<LlmPort['generateTaskSuggestions']>();
  const fakeLlmPort: LlmPort = {
    generateTaskSuggestions: generateTaskSuggestionsMock,
  };

  const prismaMock = {
    movingPlan: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.movingPlan.findUnique.mockResolvedValue(planRecord);
    generateTaskSuggestionsMock.mockResolvedValue(rawSuggestions);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskSuggestionsService,
        TaskSuggestionsValidator,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: LLM_PORT,
          useValue: fakeLlmPort,
        },
      ],
    }).compile();

    service = module.get(TaskSuggestionsService);
  });

  describe('generateSuggestions', () => {
    it('returns suggestions preview without persisting anything in the database', async () => {
      const response = await service.generateSuggestions(planId, {
        maxSuggestions: 5,
      });

      expect(response).toEqual({
        movingPlanId: planId,
        generatedAt: expect.any(String),
        suggestions: rawSuggestions,
      });

      expect(prismaMock.movingPlan.findUnique).toHaveBeenCalledWith({
        where: { id: planId },
      });
      expect(generateTaskSuggestionsMock).toHaveBeenCalledWith({
        planTitle: planRecord.title,
        origin: planRecord.origin,
        destination: planRecord.destination,
        movingDate: '2026-12-01',
        maxSuggestions: 5,
      });
    });

    it('throws NotFoundException when plan is not found', async () => {
      prismaMock.movingPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.generateSuggestions(missingPlanId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('acceptSuggestions', () => {
    it('validates and persists accepted tasks in a database transaction', async () => {
      const createdTaskRecord = {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        movingPlanId: planId,
        title: 'Contratar empresa de mudanças',
        description: 'Pedir orçamentos',
        dueDate: new Date('2026-11-15T00:00:00.000Z'),
        status: TaskStatus.TODO,
        createdAt: new Date('2026-10-28T12:00:00.000Z'),
        updatedAt: new Date('2026-10-28T12:00:00.000Z'),
      };

      const txMock = {
        task: {
          create: vi.fn().mockResolvedValue(createdTaskRecord),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      const result = await service.acceptSuggestions(planId, {
        tasks: [
          {
            title: 'Contratar empresa de mudanças',
            description: 'Pedir orçamentos',
            dueDate: '2026-11-15',
          },
        ],
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: createdTaskRecord.id,
        movingPlanId: planId,
        title: createdTaskRecord.title,
        status: TaskStatus.TODO,
        dueDate: '2026-11-15',
      });
      expect(txMock.task.create).toHaveBeenCalledWith({
        data: {
          movingPlanId: planId,
          title: 'Contratar empresa de mudanças',
          description: 'Pedir orçamentos',
          dueDate: new Date('2026-11-15T00:00:00.000Z'),
          status: 'TODO',
        },
      });
    });

    it('throws NotFoundException if plan does not exist on accept', async () => {
      prismaMock.movingPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptSuggestions(missingPlanId, {
          tasks: [{ title: 'Tarefa' }],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException if accepted task has invalid calendar date', async () => {
      await expect(
        service.acceptSuggestions(planId, {
          tasks: [{ title: 'Tarefa', dueDate: '2026-02-31' }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException if accepted task has dueDate after movingDate', async () => {
      await expect(
        service.acceptSuggestions(planId, {
          tasks: [{ title: 'Tarefa', dueDate: '2026-12-05' }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
