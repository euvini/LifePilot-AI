import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMovingPlanDto } from './dto/create-moving-plan.dto.js';
import {
  mapMovingPlanToResponse,
  MovingPlanResponse,
  parseMovingDateInput,
} from './moving-plan.mapper.js';

@Injectable()
export class MovingPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMovingPlanDto): Promise<MovingPlanResponse> {
    const plan = await this.prisma.movingPlan.create({
      data: {
        title: dto.title,
        origin: dto.origin,
        destination: dto.destination,
        movingDate: parseMovingDateInput(dto.movingDate),
      },
    });

    return mapMovingPlanToResponse(plan);
  }

  async findAll(): Promise<MovingPlanResponse[]> {
    const plans = await this.prisma.movingPlan.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return plans.map(mapMovingPlanToResponse);
  }

  async findOne(id: string): Promise<MovingPlanResponse> {
    const plan = await this.prisma.movingPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Plano de mudança não encontrado');
    }

    return mapMovingPlanToResponse(plan);
  }
}
