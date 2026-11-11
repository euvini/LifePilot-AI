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

  async create(
    dto: CreateMovingPlanDto,
    userId?: string,
  ): Promise<MovingPlanResponse> {
    const plan = await this.prisma.movingPlan.create({
      data: {
        ...(userId ? { userId } : {}),
        title: dto.title,
        origin: dto.origin,
        destination: dto.destination,
        movingDate: parseMovingDateInput(dto.movingDate),
      },
    });

    return mapMovingPlanToResponse(plan);
  }

  async findAll(userId?: string): Promise<MovingPlanResponse[]> {
    const where = userId ? { userId } : {};
    const plans = await this.prisma.movingPlan.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return plans.map(mapMovingPlanToResponse);
  }

  async findOne(id: string, userId?: string): Promise<MovingPlanResponse> {
    const plan = userId
      ? await this.prisma.movingPlan.findFirst({
          where: { id, userId },
        })
      : await this.prisma.movingPlan.findUnique({
          where: { id },
        });

    if (!plan) {
      throw new NotFoundException('Plano de mudança não encontrado');
    }

    return mapMovingPlanToResponse(plan);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const plan = userId
      ? await this.prisma.movingPlan.findFirst({
          where: { id, userId },
          select: { id: true },
        })
      : await this.prisma.movingPlan.findUnique({
          where: { id },
          select: { id: true },
        });

    if (!plan) {
      throw new NotFoundException('Plano de mudança não encontrado');
    }

    await this.prisma.movingPlan.delete({
      where: { id: plan.id },
    });
  }
}
