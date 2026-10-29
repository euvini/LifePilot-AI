import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TaskStatus } from '../../generated/prisma/client.js';
import { TaskResponse } from '../tasks/task.mapper.js';
import { TaskSuggestionsResponse } from './dto/task-suggestions-response.dto.js';
import { TaskSuggestionsController } from './task-suggestions.controller.js';
import { TaskSuggestionsService } from './task-suggestions.service.js';

describe('TaskSuggestionsController', () => {
  let controller: TaskSuggestionsController;

  const planId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const mockService = {
    generateSuggestions: vi.fn(),
    acceptSuggestions: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskSuggestionsController],
      providers: [
        {
          provide: TaskSuggestionsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(TaskSuggestionsController);
  });

  it('generate should delegate to the service', async () => {
    const expectedResponse: TaskSuggestionsResponse = {
      movingPlanId: planId,
      generatedAt: '2026-10-28T12:00:00.000Z',
      suggestions: [
        {
          title: 'Embalar itens',
          description: null,
          dueDate: null,
        },
      ],
    };
    mockService.generateSuggestions.mockResolvedValue(expectedResponse);

    await expect(
      controller.generate(planId, { maxSuggestions: 5 }),
    ).resolves.toEqual(expectedResponse);

    expect(mockService.generateSuggestions).toHaveBeenCalledWith(planId, {
      maxSuggestions: 5,
    });
  });

  it('accept should delegate to the service', async () => {
    const expectedTasks: TaskResponse[] = [
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        movingPlanId: planId,
        title: 'Embalar itens',
        description: null,
        dueDate: null,
        status: TaskStatus.TODO,
        createdAt: '2026-10-28T12:00:00.000Z',
        updatedAt: '2026-10-28T12:00:00.000Z',
      },
    ];
    mockService.acceptSuggestions.mockResolvedValue(expectedTasks);

    const dto = { tasks: [{ title: 'Embalar itens' }] };
    await expect(controller.accept(planId, dto)).resolves.toEqual(
      expectedTasks,
    );

    expect(mockService.acceptSuggestions).toHaveBeenCalledWith(planId, dto);
  });

  it('should apply ThrottlerGuard specifically to generate and not to accept or controller class', () => {
    const classGuards =
      Reflect.getMetadata('__guards__', TaskSuggestionsController) ?? [];
    const generateMethod = Object.getOwnPropertyDescriptor(
      TaskSuggestionsController.prototype,
      'generate',
    )?.value;
    const acceptMethod = Object.getOwnPropertyDescriptor(
      TaskSuggestionsController.prototype,
      'accept',
    )?.value;

    const generateGuards =
      Reflect.getMetadata('__guards__', generateMethod) ?? [];
    const acceptGuards = Reflect.getMetadata('__guards__', acceptMethod) ?? [];

    expect(classGuards).toEqual([]);
    expect(generateGuards).toContain(ThrottlerGuard);
    expect(acceptGuards).not.toContain(ThrottlerGuard);
  });
});
