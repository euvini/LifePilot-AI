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
        referenceDate: expect.any(String),
        maxSuggestions: 5,
      });
    });

    it('normalizes PT-BR terminology in suggestions preview', async () => {
      generateTaskSuggestionsMock.mockResolvedValue([
        {
          title: 'Decluttering dos pertences',
          description: 'Alugar carrinha e pacotar pertences na nova morada',
          dueDate: '2026-11-10',
        },
      ]);

      const response = await service.generateSuggestions(planId);

      expect(response.suggestions[0].title).toBe('Desapego dos pertences');
      expect(response.suggestions[0].description).toBe(
        'Alugar van de frete e embalar pertences no novo endereço',
      );
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

    it('throws BadRequestException if accepted task has dueDate before referenceDate', async () => {
      await expect(
        service.acceptSuggestions(planId, {
          tasks: [{ title: 'Tarefa', dueDate: '2020-01-01' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if accepted task has dueDate after movingDate', async () => {
      await expect(
        service.acceptSuggestions(planId, {
          tasks: [{ title: 'Tarefa', dueDate: '2026-12-05' }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts task with dueDate equal to movingDate', async () => {
      const createdTaskRecord = {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        movingPlanId: planId,
        title: 'Vistoria final',
        description: null,
        dueDate: new Date('2026-12-01T00:00:00.000Z'),
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
        tasks: [{ title: 'Vistoria final', dueDate: '2026-12-01' }],
      });

      expect(result).toHaveLength(1);
      expect(result[0].dueDate).toBe('2026-12-01');
    });

    it('persists accepted tasks in deterministic chronological order (consistency with preview)', async () => {
      const createdRecords = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          movingPlanId: planId,
          title: 'Primeira tarefa cronológica',
          description: null,
          dueDate: new Date('2026-11-05T00:00:00.000Z'),
          status: TaskStatus.TODO,
          createdAt: new Date('2026-10-28T12:00:00.000Z'),
          updatedAt: new Date('2026-10-28T12:00:00.000Z'),
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          movingPlanId: planId,
          title: 'Segunda tarefa cronológica',
          description: null,
          dueDate: new Date('2026-11-20T00:00:00.000Z'),
          status: TaskStatus.TODO,
          createdAt: new Date('2026-10-28T12:00:00.000Z'),
          updatedAt: new Date('2026-10-28T12:00:00.000Z'),
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          movingPlanId: planId,
          title: 'Tarefa sem data (final)',
          description: null,
          dueDate: null,
          status: TaskStatus.TODO,
          createdAt: new Date('2026-10-28T12:00:00.000Z'),
          updatedAt: new Date('2026-10-28T12:00:00.000Z'),
        },
      ];

      const calls: any[] = [];
      const txMock = {
        task: {
          create: vi.fn().mockImplementation((args) => {
            calls.push(args);
            return Promise.resolve(createdRecords[calls.length - 1]);
          }),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      // Pass tasks intentionally unsorted
      const unsortedPayload = [
        { title: 'Segunda tarefa cronológica', dueDate: '2026-11-20' },
        { title: 'Tarefa sem data (final)', dueDate: null },
        { title: 'Primeira tarefa cronológica', dueDate: '2026-11-05' },
      ];

      const result = await service.acceptSuggestions(planId, {
        tasks: unsortedPayload,
      });

      expect(result).toHaveLength(3);
      // Verify tasks were persisted in sorted order: 2026-11-05, then 2026-11-20, then null
      expect(calls[0].data.title).toBe('Primeira tarefa cronológica');
      expect(calls[1].data.title).toBe('Segunda tarefa cronológica');
      expect(calls[2].data.title).toBe('Tarefa sem data (final)');
    });

    it('normalizes PT-BR terminology before persisting accepted tasks', async () => {
      const calls: any[] = [];
      const txMock = {
        task: {
          create: vi.fn().mockImplementation((args) => {
            calls.push(args);
            return Promise.resolve({
              id: 'task-1',
              movingPlanId: planId,
              title: args.data.title,
              description: args.data.description,
              dueDate: args.data.dueDate,
              status: TaskStatus.TODO,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(txMock);
      });

      const payload = [
        {
          title: 'Decluttering e alugar carrinha',
          description: 'Packing as caixas e avisar na nova morada',
          dueDate: '2026-11-15',
        },
      ];

      const result = await service.acceptSuggestions(planId, {
        tasks: payload,
      });

      expect(result).toHaveLength(1);
      expect(calls[0].data.title).toBe('Desapego e alugar van de frete');
      expect(calls[0].data.description).toBe(
        'Embalar as caixas e avisar no novo endereço',
      );
      expect(result[0].title).toBe('Desapego e alugar van de frete');
      expect(result[0].description).toBe(
        'Embalar as caixas e avisar no novo endereço',
      );
    });
  });

  describe('sortSuggestionsChronologically (P1: Deterministic Sorting)', () => {
    it('1. sorts dates in ascending chronological order', () => {
      const items = [
        { title: 'Tarefa C', dueDate: '2026-11-25' },
        { title: 'Tarefa A', dueDate: '2026-11-05' },
        { title: 'Tarefa B', dueDate: '2026-11-15' },
      ];

      const sorted = service.sortSuggestionsChronologically(items);

      expect(sorted.map((i) => i.dueDate)).toEqual([
        '2026-11-05',
        '2026-11-15',
        '2026-11-25',
      ]);
      expect(sorted.map((i) => i.title)).toEqual([
        'Tarefa A',
        'Tarefa B',
        'Tarefa C',
      ]);
    });

    it('2. preserves original relative order when dates are equal (stable sort)', () => {
      const items = [
        { title: 'Primeira com mesma data', dueDate: '2026-11-10' },
        { title: 'Segunda com mesma data', dueDate: '2026-11-10' },
        { title: 'Terceira com mesma data', dueDate: '2026-11-10' },
      ];

      const sorted = service.sortSuggestionsChronologically(items);

      expect(sorted.map((i) => i.title)).toEqual([
        'Primeira com mesma data',
        'Segunda com mesma data',
        'Terceira com mesma data',
      ]);
    });

    it('3. places null/undefined dates at the end while preserving their relative order', () => {
      const items = [
        { title: 'Sem data 1', dueDate: null },
        { title: 'Com data intermediária', dueDate: '2026-11-15' },
        { title: 'Sem data 2', dueDate: undefined },
        { title: 'Com data inicial', dueDate: '2026-11-02' },
      ];

      const sorted = service.sortSuggestionsChronologically(items);

      expect(sorted.map((i) => i.title)).toEqual([
        'Com data inicial',
        'Com data intermediária',
        'Sem data 1',
        'Sem data 2',
      ]);
    });

    it('4. preserves exact suggestions and contents (no modification or dropping)', () => {
      const items = [
        {
          title: 'Tarefa X',
          description: 'Descrição detalhada X',
          dueDate: '2026-11-20',
        },
        {
          title: 'Tarefa Y',
          description: 'Descrição detalhada Y',
          dueDate: '2026-11-10',
        },
      ];

      const sorted = service.sortSuggestionsChronologically(items);

      expect(sorted).toHaveLength(2);
      expect(sorted[0]).toEqual({
        title: 'Tarefa Y',
        description: 'Descrição detalhada Y',
        dueDate: '2026-11-10',
      });
      expect(sorted[1]).toEqual({
        title: 'Tarefa X',
        description: 'Descrição detalhada X',
        dueDate: '2026-11-20',
      });
      // Original array remains untouched
      expect(items[0].title).toBe('Tarefa X');
    });

    it('5. ensures generateSuggestions preview returns chronologically sorted suggestions', async () => {
      generateTaskSuggestionsMock.mockResolvedValue([
        { title: 'Tardio', description: 'Desc 2', dueDate: '2026-11-28' },
        { title: 'Antecipado', description: 'Desc 1', dueDate: '2026-11-05' },
      ]);

      const response = await service.generateSuggestions(planId);

      expect(response.suggestions).toHaveLength(2);
      expect(response.suggestions[0].title).toBe('Antecipado');
      expect(response.suggestions[0].dueDate).toBe('2026-11-05');
      expect(response.suggestions[1].title).toBe('Tardio');
      expect(response.suggestions[1].dueDate).toBe('2026-11-28');
    });
  });

  describe('P3.3 — Semantic Compatibility Filtering in Preview and Accept', () => {
    it('filters out incompatible specialized tasks in generateSuggestions while preserving compatible, generic, PT-BR normalized, and chronologically sorted tasks', async () => {
      prismaMock.movingPlan.findUnique.mockResolvedValue({
        ...planRecord,
        title: 'Mudança com dois cães, sem plantas e sem home office',
      });

      generateTaskSuggestionsMock.mockResolvedValue([
        {
          title: 'Decluttering dos armários na nova morada',
          description: 'Separar roupas para doação',
          dueDate: '2026-11-20',
        },
        {
          title: 'Preparar vasos de plantas e podar o jardim',
          description: 'Regar as mudas antes da mudança',
          dueDate: '2026-11-08',
        },
        {
          title: 'Fazer backup dos servidores de TI do home office',
          description: 'Desmontar estação de trabalho',
          dueDate: '2026-11-12',
        },
        {
          title: 'Agendar consulta com veterinário para os cães',
          description: 'Atualizar vacinas dos pets',
          dueDate: '2026-11-05',
        },
      ]);

      const response = await service.generateSuggestions(planId);

      expect(response.suggestions).toEqual([
        {
          title: 'Agendar consulta com veterinário para os cães',
          description: 'Atualizar vacinas dos pets',
          dueDate: '2026-11-05',
        },
        {
          title: 'Desapego dos armários no novo endereço',
          description: 'Separar roupas para doação',
          dueDate: '2026-11-20',
        },
      ]);
    });

    it('prevents acceptSuggestions from reintroducing tasks that preview discarded (consistency between preview and accept)', async () => {
      prismaMock.movingPlan.findUnique.mockResolvedValue({
        ...planRecord,
        title: 'Mudança sem animais e não sou estudante',
      });

      const persisted: any[] = [];
      const txMock = {
        task: {
          create: vi.fn().mockImplementation((args) => {
            persisted.push(args.data);
            return Promise.resolve({
              id: `id-${persisted.length}`,
              movingPlanId: planId,
              title: args.data.title,
              description: args.data.description,
              dueDate: args.data.dueDate,
              status: TaskStatus.TODO,
              createdAt: new Date('2026-10-30T10:00:00.000Z'),
              updatedAt: new Date('2026-10-30T10:00:00.000Z'),
            });
          }),
        },
      };

      prismaMock.$transaction.mockImplementation(async (cb) => cb(txMock));

      const candidateTasks = [
        {
          title: 'Agendar consulta com veterinário para os cães',
          description: 'Vacinação animal',
          dueDate: '2026-11-05',
        },
        {
          title: 'Confirmar matrícula na secretaria da universidade',
          description: 'Separar materiais acadêmicos da faculdade',
          dueDate: '2026-11-10',
        },
        {
          title: 'Transferir contas de água, luz e internet',
          description: 'Comunicar novo endereço',
          dueDate: '2026-11-18',
        },
        {
          title: 'Providenciar caixas de papelão e fita adesiva',
          description: 'Embalar louças da cozinha',
          dueDate: '2026-11-12',
        },
      ];

      generateTaskSuggestionsMock.mockResolvedValue(candidateTasks);
      const preview = await service.generateSuggestions(planId);

      // Even if the client submits the full unfiltered list to acceptSuggestions:
      const accepted = await service.acceptSuggestions(planId, {
        tasks: candidateTasks,
      });

      expect(preview.suggestions).toHaveLength(2);
      expect(accepted).toHaveLength(2);
      expect(accepted.map((t) => t.title)).toEqual(
        preview.suggestions.map((s) => s.title),
      );
      expect(accepted.map((t) => t.title)).toEqual([
        'Providenciar caixas de papelão e fita adesiva',
        'Transferir contas de água, luz e internet',
      ]);
    });

    it('returns an empty list without inventing replacement tasks when all tasks are discarded in preview and accept', async () => {
      prismaMock.movingPlan.findUnique.mockResolvedValue({
        ...planRecord,
        title: 'Mudança sem animais e sem plantas',
      });

      const incompatibleOnly = [
        {
          title: 'Agendar consulta com veterinário para os cães',
          description: 'Atualizar vacinas',
          dueDate: '2026-11-10',
        },
        {
          title: 'Preparar vasos de plantas e podar o jardim',
          description: 'Regar mudas',
          dueDate: '2026-11-12',
        },
      ];

      generateTaskSuggestionsMock.mockResolvedValue(incompatibleOnly);
      const preview = await service.generateSuggestions(planId);
      expect(preview.suggestions).toEqual([]);

      const accepted = await service.acceptSuggestions(planId, {
        tasks: incompatibleOnly,
      });
      expect(accepted).toEqual([]);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejects tasks with BadRequestException when title exceeds 200 characters after normalization', async () => {
      const plan = {
        id: planId,
        title: 'Mudança residencial',
        origin: 'Lisboa',
        destination: 'Porto',
        movingDate: new Date('2026-12-01T00:00:00.000Z'),
      };
      prismaMock.movingPlan.findUnique.mockResolvedValue(plan);

      const title198 = `Reservar carrinha ${'a'.repeat(180)}`; // expands to 202 chars
      await expect(
        service.acceptSuggestions(planId, {
          tasks: [{ title: title198, description: null, dueDate: '2026-11-20' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
