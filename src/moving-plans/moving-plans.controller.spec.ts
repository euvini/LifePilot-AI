import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateMovingPlanDto } from './dto/create-moving-plan.dto.js';
import { MovingPlansController } from './moving-plans.controller.js';
import { MovingPlanResponse } from './moving-plan.mapper.js';
import { MovingPlansService } from './moving-plans.service.js';

describe('MovingPlansController', () => {
  let controller: MovingPlansController;

  const planId = '11111111-1111-1111-1111-111111111111';
  const missingPlanId = '00000000-0000-0000-0000-000000000000';

  const sampleDto: CreateMovingPlanDto = {
    title: 'Mudança para Lisboa',
    origin: 'Porto',
    destination: 'Lisboa',
    movingDate: '2026-12-01',
  };

  const samplePlan: MovingPlanResponse = {
    id: planId,
    title: sampleDto.title,
    origin: sampleDto.origin,
    destination: sampleDto.destination,
    movingDate: sampleDto.movingDate,
    createdAt: '2026-10-28T12:00:00.000Z',
    updatedAt: '2026-10-28T12:00:00.000Z',
  };

  const movingPlansService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovingPlansController],
      providers: [
        {
          provide: MovingPlansService,
          useValue: movingPlansService,
        },
      ],
    }).compile();

    controller = module.get<MovingPlansController>(MovingPlansController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should delegate to the service', async () => {
    movingPlansService.create.mockResolvedValue(samplePlan);

    await expect(controller.create(sampleDto)).resolves.toEqual(samplePlan);
    expect(movingPlansService.create).toHaveBeenCalledWith(sampleDto);
  });

  it('findAll should return the service list', async () => {
    movingPlansService.findAll.mockResolvedValue([samplePlan]);

    await expect(controller.findAll()).resolves.toEqual([samplePlan]);
    expect(movingPlansService.findAll).toHaveBeenCalledTimes(1);
  });

  it('findOne should return the plan from the service', async () => {
    movingPlansService.findOne.mockResolvedValue(samplePlan);

    await expect(controller.findOne(samplePlan.id)).resolves.toEqual(
      samplePlan,
    );
    expect(movingPlansService.findOne).toHaveBeenCalledWith(samplePlan.id);
  });

  it('findOne should propagate NotFoundException from the service', async () => {
    movingPlansService.findOne.mockRejectedValue(
      new NotFoundException('Plano de mudança não encontrado'),
    );

    await expect(controller.findOne(missingPlanId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
