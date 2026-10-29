import type { MovingPlan as MovingPlanRecord } from '../generated/prisma/client.js';

export interface MovingPlanResponse {
  id: string;
  title: string;
  origin: string;
  destination: string;
  movingDate: string;
  createdAt: string;
  updatedAt: string;
}

export function toDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toIsoDateTimeString(value: Date): string {
  return value.toISOString();
}

export function parseMovingDateInput(movingDate: string): Date {
  const normalized = movingDate.includes('T')
    ? movingDate
    : `${movingDate}T00:00:00.000Z`;
  return new Date(normalized);
}

export function mapMovingPlanToResponse(
  plan: MovingPlanRecord,
): MovingPlanResponse {
  return {
    id: plan.id,
    title: plan.title,
    origin: plan.origin,
    destination: plan.destination,
    movingDate: toDateOnlyString(plan.movingDate),
    createdAt: toIsoDateTimeString(plan.createdAt),
    updatedAt: toIsoDateTimeString(plan.updatedAt),
  };
}
