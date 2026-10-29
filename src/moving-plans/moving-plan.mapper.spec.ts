import {
  mapMovingPlanToResponse,
  parseMovingDateInput,
  toDateOnlyString,
  toIsoDateTimeString,
} from './moving-plan.mapper.js';

describe('moving-plan.mapper', () => {
  it('toDateOnlyString should return YYYY-MM-DD in UTC', () => {
    expect(toDateOnlyString(new Date('2026-12-01T00:00:00.000Z'))).toBe(
      '2026-12-01',
    );
  });

  it('toIsoDateTimeString should return a full ISO-8601 timestamp', () => {
    const value = new Date('2026-10-28T15:30:45.123Z');
    expect(toIsoDateTimeString(value)).toBe('2026-10-28T15:30:45.123Z');
  });

  it('parseMovingDateInput should parse YYYY-MM-DD as UTC midnight', () => {
    expect(parseMovingDateInput('2026-12-01').toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );
  });

  it('parseMovingDateInput should accept ISO strings with time component', () => {
    expect(parseMovingDateInput('2026-12-01T14:30:00.000Z').toISOString()).toBe(
      '2026-12-01T14:30:00.000Z',
    );
  });

  it('mapMovingPlanToResponse should map Prisma dates to API strings', () => {
    const response = mapMovingPlanToResponse({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Mudança para Lisboa',
      origin: 'Porto',
      destination: 'Lisboa',
      movingDate: new Date('2026-12-01T00:00:00.000Z'),
      createdAt: new Date('2026-10-28T12:00:00.000Z'),
      updatedAt: new Date('2026-10-28T12:05:00.000Z'),
    });

    expect(response).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Mudança para Lisboa',
      origin: 'Porto',
      destination: 'Lisboa',
      movingDate: '2026-12-01',
      createdAt: '2026-10-28T12:00:00.000Z',
      updatedAt: '2026-10-28T12:05:00.000Z',
    });
  });
});
