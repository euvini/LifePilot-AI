import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TasksService } from './tasks.service.js';

describe('TasksService', () => {
  let service: TasksService;

  const planId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const otherPlanId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const taskId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  const taskRecord = {
    id: taskId,
    movingPlanId: planId,
    title: 'Embalar cozinha',
    description: 'Caixas frágeis',
    dueDate: new Date('2026-11-15T00:00:00.000Z'),
    status: TaskStatus.TODO,
    createdAt: new Date('2026-10-28T12:00:00.000Z'),
    updatedAt: new Date('2026-10-28T12:00:00.000Z'),
  };

  const prisma = {
    movingPlan: {
      findUnique: vi.fn(),
    },
    task: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.movingPlan.findUnique.mockResolvedValue({ id: planId });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  it('create should persist a task for an existing plan', async () => {
    prisma.task.create.mockResolvedValue(taskRecord);

    const result = await service.create(planId, {
      title: 'Embalar cozinha',
      description: 'Caixas frágeis',
      dueDate: '2026-11-15',
    });

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: {
        movingPlanId: planId,
        title: 'Embalar cozinha',
        description: 'Caixas frágeis',
        dueDate: new Date('2026-11-15T00:00:00.000Z'),
        status: undefined,
      },
    });
    expect(result).toMatchObject({
      id: taskId,
      movingPlanId: planId,
      title: 'Embalar cozinha',
      dueDate: '2026-11-15',
      status: TaskStatus.TODO,
    });
  });

  it('create should throw when the plan does not exist', async () => {
    prisma.movingPlan.findUnique.mockResolvedValue(null);

    await expect(
      service.create(planId, { title: 'Embalar' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAll should list tasks for a plan', async () => {
    prisma.task.findMany.mockResolvedValue([taskRecord]);

    await expect(service.findAll(planId)).resolves.toEqual([
      expect.objectContaining({
        id: taskId,
        dueDate: '2026-11-15',
      }),
    ]);
  });

  it('findOne should throw for a task belonging to another plan', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(service.findOne(otherPlanId, taskId)).rejects.toThrow(
      'Tarefa não encontrada',
    );
  });

  it('update should reject an empty body', async () => {
    await expect(service.update(planId, taskId, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('update should clear description and dueDate with null', async () => {
    prisma.task.findFirst.mockResolvedValue(taskRecord);
    prisma.task.update.mockResolvedValue({
      ...taskRecord,
      description: null,
      dueDate: null,
      status: TaskStatus.IN_PROGRESS,
    });

    const result = await service.update(planId, taskId, {
      description: null,
      dueDate: null,
      status: TaskStatus.IN_PROGRESS,
    });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: taskId },
      data: {
        description: null,
        dueDate: null,
        status: TaskStatus.IN_PROGRESS,
      },
    });
    expect(result.description).toBeNull();
    expect(result.dueDate).toBeNull();
    expect(result.status).toBe(TaskStatus.IN_PROGRESS);
  });

  it('remove should delete after verifying plan and task ownership', async () => {
    prisma.task.findFirst.mockResolvedValue(taskRecord);
    prisma.task.delete.mockResolvedValue(taskRecord);

    await expect(service.remove(planId, taskId)).resolves.toBeUndefined();
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: taskId } });
  });

  it('remove should throw when task is missing', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(service.remove(planId, taskId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
