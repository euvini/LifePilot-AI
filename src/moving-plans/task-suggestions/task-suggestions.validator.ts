import { BadGatewayException, Injectable } from '@nestjs/common';
import { RawLlmTaskSuggestion } from '../../ai/ports/llm.port.js';
import { TaskSuggestionItemResponse } from './dto/task-suggestions-response.dto.js';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidCalendarDate(dateString: string): boolean {
  if (!ISO_DATE_REGEX.test(dateString)) {
    return false;
  }
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

@Injectable()
export class TaskSuggestionsValidator {
  validateLlmSuggestions(
    rawSuggestions: RawLlmTaskSuggestion[],
    movingDate: string,
    maxLimit: number = 20,
  ): TaskSuggestionItemResponse[] {
    if (!Array.isArray(rawSuggestions) || rawSuggestions.length === 0) {
      throw new BadGatewayException(
        'O assistente de IA não retornou nenhuma sugestão válida.',
      );
    }

    if (rawSuggestions.length > maxLimit) {
      throw new BadGatewayException(
        `O assistente de IA excedeu o limite máximo de ${maxLimit} sugestões.`,
      );
    }

    const validated: TaskSuggestionItemResponse[] = [];

    for (const item of rawSuggestions) {
      if (!item || typeof item !== 'object') {
        throw new BadGatewayException(
          'Formato inválido de item retornado pelo assistente de IA.',
        );
      }

      const title = typeof item.title === 'string' ? item.title.trim() : '';
      if (!title || title.length > 200) {
        throw new BadGatewayException(
          'O assistente de IA gerou uma tarefa com título ausente ou excessivamente longo.',
        );
      }

      let description: string | null = null;
      if (typeof item.description === 'string') {
        const trimmedDesc = item.description.trim();
        if (trimmedDesc.length > 2000) {
          throw new BadGatewayException(
            'O assistente de IA gerou uma tarefa com descrição que excede 2000 caracteres.',
          );
        }
        description = trimmedDesc.length > 0 ? trimmedDesc : null;
      }

      let dueDate: string | null = null;
      if (typeof item.dueDate === 'string' && item.dueDate.trim().length > 0) {
        const trimmedDate = item.dueDate.trim();
        if (!isValidCalendarDate(trimmedDate)) {
          throw new BadGatewayException(
            `O assistente de IA gerou uma data inválida: "${trimmedDate}".`,
          );
        }
        if (trimmedDate > movingDate) {
          throw new BadGatewayException(
            `O assistente de IA gerou um prazo (${trimmedDate}) posterior à data da mudança (${movingDate}).`,
          );
        }
        dueDate = trimmedDate;
      }

      validated.push({
        title,
        description,
        dueDate,
      });
    }

    return validated;
  }
}
