import type {
  Task as TaskRecord,
  TaskStatus,
} from '../../generated/prisma/client.js';
import {
  parseMovingDateInput,
  toDateOnlyString,
  toIsoDateTimeString,
} from '../moving-plan.mapper.js';

export interface TaskResponse {
  id: string;
  movingPlanId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export function mapTaskToResponse(task: TaskRecord): TaskResponse {
  return {
    id: task.id,
    movingPlanId: task.movingPlanId,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ? toDateOnlyString(task.dueDate) : null,
    status: task.status,
    createdAt: toIsoDateTimeString(task.createdAt),
    updatedAt: toIsoDateTimeString(task.updatedAt),
  };
}

export function parseOptionalDueDate(
  dueDate: string | null | undefined,
): Date | null | undefined {
  if (dueDate === undefined) {
    return undefined;
  }
  if (dueDate === null) {
    return null;
  }
  return parseMovingDateInput(dueDate);
}
