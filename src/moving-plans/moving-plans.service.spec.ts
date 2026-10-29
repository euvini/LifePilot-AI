import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMovingPlanDto } from './dto/create-moving-plan.dto.js';
import { MovingPlansService } from './moving-plans.service.js';

describe('MovingPlansService', () => {
  let service: MovingPlansService;

  const sampleDto: CreateMovingPlanDto = {
    title: 'Mudança para Lisboa',
    origin: 'Porto',
    destination: 'Lisboa',
    movingDate: '2026-12-01',
  };

  const sampleRecord = {
    id: '11111111-1111-1111-1111-111111111111',
    title: sampleDto.title,
    origin: sampleDto.origin,
    destination: sampleDto.destination,
    movingDate: new Date('2026-12-01T00:00:00.000Z'),
    createdAt: new Date('2026-10-28T12:00:00.000Z'),
    updatedAt: new Date('2026-10-28T12:00:00.000Z'),
  };

  const prisma = {
    movingPlan: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovingPlansService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<MovingPlansService>(MovingPlansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should persist via Prisma and map date fields', async () => {
    prisma.movingPlan.create.mockResolvedValue(sampleRecord);

    const plan = await service.create(sampleDto);

    expect(prisma.movingPlan.create).toHaveBeenCalledWith({
      data: {
        title: sampleDto.title,
        origin: sampleDto.origin,
        destination: sampleDto.destination,
        movingDate: new Date('2026-12-01T00:00:00.000Z'),
      },
    });
    expect(plan).toEqual({
      id: sampleRecord.id,
      title: sampleDto.title,
      origin: sampleDto.origin,
      destination: sampleDto.destination,
      movingDate: '2026-12-01',
      createdAt: '2026-10-28T12:00:00.000Z',
      updatedAt: '2026-10-28T12:00:00.000Z',
    });
  });

  it('findAll should return an empty list when Prisma returns none', async () => {
    prisma.movingPlan.findMany.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('findAll should map all created plans', async () => {
    const secondRecord = {
      ...sampleRecord,
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Mudança para Braga',
    };
    prisma.movingPlan.findMany.mockResolvedValue([sampleRecord, secondRecord]);

    await expect(service.findAll()).resolves.toEqual([
      {
        id: sampleRecord.id,
        title: sampleDto.title,
        origin: sampleDto.origin,
        destination: sampleDto.destination,
        movingDate: '2026-12-01',
        createdAt: '2026-10-28T12:00:00.000Z',
        updatedAt: '2026-10-28T12:00:00.000Z',
      },
      {
        id: secondRecord.id,
        title: 'Mudança para Braga',
        origin: sampleDto.origin,
        destination: sampleDto.destination,
        movingDate: '2026-12-01',
        createdAt: '2026-10-28T12:00:00.000Z',
        updatedAt: '2026-10-28T12:00:00.000Z',
      },
    ]);
  });

  it('findOne should return the mapped plan by id', async () => {
    prisma.movingPlan.findUnique.mockResolvedValue(sampleRecord);

    await expect(service.findOne(sampleRecord.id)).resolves.toEqual({
      id: sampleRecord.id,
      title: sampleDto.title,
      origin: sampleDto.origin,
      destination: sampleDto.destination,
      movingDate: '2026-12-01',
      createdAt: '2026-10-28T12:00:00.000Z',
      updatedAt: '2026-10-28T12:00:00.000Z',
    });
  });

  it('findOne should throw NotFoundException for unknown id', async () => {
    prisma.movingPlan.findUnique.mockResolvedValue(null);

    await expect(
      service.findOne('00000000-0000-0000-0000-000000000000'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.findOne('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow('Plano de mudança não encontrado');
  });
});
