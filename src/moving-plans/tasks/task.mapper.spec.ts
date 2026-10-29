import { TaskStatus } from '../../generated/prisma/client.js';
import { mapTaskToResponse, parseOptionalDueDate } from './task.mapper.js';

describe('task.mapper', () => {
  it('mapTaskToResponse should map dates and nullable fields', () => {
    const response = mapTaskToResponse({
      id: '11111111-1111-1111-1111-111111111111',
      movingPlanId: '22222222-2222-2222-2222-222222222222',
      title: 'Embalar cozinha',
      description: 'Caixas frágeis',
      dueDate: new Date('2026-11-15T00:00:00.000Z'),
      status: TaskStatus.TODO,
      createdAt: new Date('2026-10-28T12:00:00.000Z'),
      updatedAt: new Date('2026-10-28T12:05:00.000Z'),
    });

    expect(response).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      movingPlanId: '22222222-2222-2222-2222-222222222222',
      title: 'Embalar cozinha',
      description: 'Caixas frágeis',
      dueDate: '2026-11-15',
      status: TaskStatus.TODO,
      createdAt: '2026-10-28T12:00:00.000Z',
      updatedAt: '2026-10-28T12:05:00.000Z',
    });
  });

  it('mapTaskToResponse should keep null description and dueDate', () => {
    const response = mapTaskToResponse({
      id: '11111111-1111-1111-1111-111111111111',
      movingPlanId: '22222222-2222-2222-2222-222222222222',
      title: 'Embalar cozinha',
      description: null,
      dueDate: null,
      status: TaskStatus.DONE,
      createdAt: new Date('2026-10-28T12:00:00.000Z'),
      updatedAt: new Date('2026-10-28T12:05:00.000Z'),
    });

    expect(response.description).toBeNull();
    expect(response.dueDate).toBeNull();
  });

  it('parseOptionalDueDate should parse, clear, or omit', () => {
    expect(parseOptionalDueDate(undefined)).toBeUndefined();
    expect(parseOptionalDueDate(null)).toBeNull();
    expect(parseOptionalDueDate('2026-11-15')?.toISOString()).toBe(
      '2026-11-15T00:00:00.000Z',
    );
  });
});
