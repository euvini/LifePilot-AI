import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { LlmPort } from '../../ai/ports/llm.port.js';
import { LLM_PORT } from '../../ai/ports/llm.port.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { toDateOnlyString } from '../moving-plan.mapper.js';
import {
  mapTaskToResponse,
  parseOptionalDueDate,
  TaskResponse,
} from '../tasks/task.mapper.js';
import { AcceptTaskSuggestionsDto } from './dto/accept-task-suggestions.dto.js';
import { GenerateTaskSuggestionsDto } from './dto/generate-task-suggestions.dto.js';
import { TaskSuggestionsResponse } from './dto/task-suggestions-response.dto.js';
import {
  filterCompatibleSuggestions,
  isValidCalendarDate,
  normalizeSuggestionsPtBr,
  TaskSuggestionsValidator,
} from './task-suggestions.validator.js';

@Injectable()
export class TaskSuggestionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PORT) private readonly llmPort: LlmPort,
    private readonly validator: TaskSuggestionsValidator,
  ) {}

  async generateSuggestions(
    planId: string,
    dto?: GenerateTaskSuggestionsDto,
  ): Promise<TaskSuggestionsResponse> {
    const plan = await this.prisma.movingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plano de mudança não encontrado');
    }

    const referenceDate = toDateOnlyString(new Date());
    const movingDate = toDateOnlyString(plan.movingDate);
    const maxSuggestions = Math.min(Math.max(dto?.maxSuggestions ?? 10, 1), 20);

    const rawSuggestions = await this.llmPort.generateTaskSuggestions({
      planTitle: plan.title,
      origin: plan.origin,
      destination: plan.destination,
      movingDate,
      referenceDate,
      maxSuggestions,
    });

    const suggestions = this.validator.validateLlmSuggestions(
      rawSuggestions,
      movingDate,
      referenceDate,
      20,
    );

    const planContext = this.validator.extractPlanContext(plan);
    const compatibleSuggestions = filterCompatibleSuggestions(
      suggestions,
      planContext,
    );
    const sortedSuggestions = this.sortSuggestionsChronologically(
      compatibleSuggestions,
    );

    return {
      movingPlanId: plan.id,
      generatedAt: new Date().toISOString(),
      suggestions: sortedSuggestions,
    };
  }

  public sortSuggestionsChronologically<T extends { dueDate?: string | null }>(
    items: T[],
  ): T[] {
    return [...items].sort((a, b) => {
      const dateA = a.dueDate ? a.dueDate.trim() : null;
      const dateB = b.dueDate ? b.dueDate.trim() : null;

      if (dateA === dateB) {
        return 0;
      }
      if (!dateA) {
        return 1;
      }
      if (!dateB) {
        return -1;
      }
      return dateA.localeCompare(dateB);
    });
  }

  async acceptSuggestions(
    planId: string,
    dto: AcceptTaskSuggestionsDto,
  ): Promise<TaskResponse[]> {
    const plan = await this.prisma.movingPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plano de mudança não encontrado');
    }

    const referenceDate = toDateOnlyString(new Date());
    const movingDate = toDateOnlyString(plan.movingDate);

    for (const item of dto.tasks) {
      if (typeof item.dueDate === 'string' && item.dueDate.trim().length > 0) {
        const trimmedDueDate = item.dueDate.trim();
        if (!isValidCalendarDate(trimmedDueDate)) {
          throw new BadRequestException(
            `Data de prazo inválida: "${trimmedDueDate}". Utilize o formato YYYY-MM-DD.`,
          );
        }
        if (trimmedDueDate < referenceDate) {
          throw new BadRequestException(
            `O prazo da tarefa (${trimmedDueDate}) não pode ser anterior à data de referência (${referenceDate}).`,
          );
        }
        if (trimmedDueDate > movingDate) {
          throw new BadRequestException(
            `O prazo da tarefa (${trimmedDueDate}) não pode ser posterior à data da mudança (${movingDate}).`,
          );
        }
      }
    }

    const normalizedTasks = normalizeSuggestionsPtBr(dto.tasks);
    for (const item of normalizedTasks) {
      if (item.title.trim().length > 200) {
        throw new BadRequestException(
          'O título da tarefa não pode exceder 200 caracteres após normalização.',
        );
      }
      if (item.description && item.description.trim().length > 2000) {
        throw new BadRequestException(
          'A descrição da tarefa não pode exceder 2000 caracteres após normalização.',
        );
      }
    }
    const planContext = this.validator.extractPlanContext(plan);
    const compatibleTasks = filterCompatibleSuggestions(
      normalizedTasks,
      planContext,
    );
    const sortedTasks = this.sortSuggestionsChronologically(compatibleTasks);

    if (sortedTasks.length === 0) {
      return [];
    }

    const createdTasks = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of sortedTasks) {
        const trimmedDescription = item.description?.trim();
        const task = await tx.task.create({
          data: {
            movingPlanId: planId,
            title: item.title.trim(),
            description:
              trimmedDescription && trimmedDescription.length > 0
                ? trimmedDescription
                : null,
            dueDate: parseOptionalDueDate(item.dueDate) ?? null,
            status: 'TODO',
          },
        });
        results.push(task);
      }
      return results;
    });

    return createdTasks.map(mapTaskToResponse);
  }
}
