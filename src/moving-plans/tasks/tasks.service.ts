import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import {
  mapTaskToResponse,
  parseOptionalDueDate,
  TaskResponse,
} from './task.mapper.js';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(planId: string, dto: CreateTaskDto): Promise<TaskResponse> {
    await this.ensurePlanExists(planId);

    try {
      const task = await this.prisma.task.create({
        data: {
          movingPlanId: planId,
          title: dto.title,
          description: dto.description,
          dueDate: parseOptionalDueDate(dto.dueDate) ?? undefined,
          status: dto.status,
        },
      });

      return mapTaskToResponse(task);
    } catch (error) {
      this.rethrowAsHttpException(error);
    }
  }

  async findAll(planId: string): Promise<TaskResponse[]> {
    await this.ensurePlanExists(planId);

    const tasks = await this.prisma.task.findMany({
      where: { movingPlanId: planId },
      orderBy: { createdAt: 'asc' },
    });

    return tasks.map(mapTaskToResponse);
  }

  async findOne(planId: string, taskId: string): Promise<TaskResponse> {
    await this.ensurePlanExists(planId);
    return mapTaskToResponse(await this.findTaskOrThrow(planId, taskId));
  }

  async update(
    planId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    this.assertHasUpdateFields(dto);
    await this.ensurePlanExists(planId);
    await this.findTaskOrThrow(planId, taskId);

    const data: Prisma.TaskUpdateInput = {};

    if (dto.title !== undefined) {
      data.title = dto.title;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.dueDate !== undefined) {
      data.dueDate = parseOptionalDueDate(dto.dueDate) ?? null;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data,
    });

    return mapTaskToResponse(updated);
  }

  async remove(planId: string, taskId: string): Promise<void> {
    await this.ensurePlanExists(planId);
    await this.findTaskOrThrow(planId, taskId);

    await this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  private assertHasUpdateFields(dto: UpdateTaskDto): void {
    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.dueDate === undefined &&
      dto.status === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }
  }

  private async ensurePlanExists(planId: string): Promise<void> {
    const plan = await this.prisma.movingPlan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!plan) {
      throw new NotFoundException('Plano de mudança não encontrado');
    }
  }

  private async findTaskOrThrow(planId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        movingPlanId: planId,
      },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    return task;
  }

  private rethrowAsHttpException(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new NotFoundException('Plano de mudança não encontrado');
    }

    throw error;
  }
}
