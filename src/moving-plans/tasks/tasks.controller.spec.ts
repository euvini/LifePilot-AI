import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '../../generated/prisma/client.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

describe('TasksController', () => {
  let controller: TasksController;

  const planId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const taskId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  const taskResponse = {
    id: taskId,
    movingPlanId: planId,
    title: 'Embalar cozinha',
    description: null,
    dueDate: null,
    status: TaskStatus.TODO,
    createdAt: '2026-10-28T12:00:00.000Z',
    updatedAt: '2026-10-28T12:00:00.000Z',
  };

  const tasksService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: tasksService,
        },
      ],
    }).compile();

    controller = module.get(TasksController);
  });

  it('create should delegate to the service', async () => {
    tasksService.create.mockResolvedValue(taskResponse);

    await expect(
      controller.create(planId, { title: 'Embalar cozinha' }),
    ).resolves.toEqual(taskResponse);
    expect(tasksService.create).toHaveBeenCalledWith(planId, {
      title: 'Embalar cozinha',
    });
  });

  it('findOne should propagate NotFoundException', async () => {
    tasksService.findOne.mockRejectedValue(
      new NotFoundException('Tarefa não encontrada'),
    );

    await expect(controller.findOne(planId, taskId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove should delegate to the service', async () => {
    tasksService.remove.mockResolvedValue(undefined);

    await expect(controller.remove(planId, taskId)).resolves.toBeUndefined();
    expect(tasksService.remove).toHaveBeenCalledWith(planId, taskId);
  });
});
