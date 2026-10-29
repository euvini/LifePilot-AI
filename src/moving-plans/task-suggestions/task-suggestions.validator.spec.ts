import { BadGatewayException } from '@nestjs/common';
import {
  isValidCalendarDate,
  TaskSuggestionsValidator,
} from './task-suggestions.validator.js';

describe('TaskSuggestionsValidator', () => {
  let validator: TaskSuggestionsValidator;

  beforeEach(() => {
    validator = new TaskSuggestionsValidator();
  });

  describe('isValidCalendarDate', () => {
    it('accepts valid dates in YYYY-MM-DD format', () => {
      expect(isValidCalendarDate('2026-12-01')).toBe(true);
      expect(isValidCalendarDate('2026-02-28')).toBe(true);
    });

    it('rejects invalid calendar dates', () => {
      expect(isValidCalendarDate('2026-02-31')).toBe(false);
      expect(isValidCalendarDate('2026-13-01')).toBe(false);
      expect(isValidCalendarDate('2026-04-31')).toBe(false);
    });

    it('rejects non-matching formats', () => {
      expect(isValidCalendarDate('01-12-2026')).toBe(false);
      expect(isValidCalendarDate('2026/12/01')).toBe(false);
      expect(isValidCalendarDate('not-a-date')).toBe(false);
    });
  });

  describe('validateLlmSuggestions', () => {
    const movingDate = '2026-12-01';

    it('validates and returns properly formatted suggestions', () => {
      const raw = [
        {
          title: 'Organizar caixas',
          description: 'Identificar itens frágeis',
          dueDate: '2026-11-20',
        },
        {
          title: 'Notificar condomínio',
          description: null,
          dueDate: null,
        },
      ];

      const result = validator.validateLlmSuggestions(raw, movingDate);

      expect(result).toEqual([
        {
          title: 'Organizar caixas',
          description: 'Identificar itens frágeis',
          dueDate: '2026-11-20',
        },
        {
          title: 'Notificar condomínio',
          description: null,
          dueDate: null,
        },
      ]);
    });

    it('throws BadGatewayException when raw suggestions is empty or not an array', () => {
      expect(() => validator.validateLlmSuggestions([], movingDate)).toThrow(
        BadGatewayException,
      );
    });

    it('throws BadGatewayException when suggestions exceed maxLimit', () => {
      const raw = Array.from({ length: 21 }, (_, i) => ({
        title: `Tarefa ${i + 1}`,
        description: null,
        dueDate: null,
      }));

      expect(() =>
        validator.validateLlmSuggestions(raw, movingDate, 20),
      ).toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when title is missing or empty', () => {
      expect(() =>
        validator.validateLlmSuggestions(
          [{ title: '', description: null, dueDate: null }],
          movingDate,
        ),
      ).toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when title exceeds 200 characters', () => {
      expect(() =>
        validator.validateLlmSuggestions(
          [{ title: 'a'.repeat(201), description: null, dueDate: null }],
          movingDate,
        ),
      ).toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when description exceeds 2000 characters', () => {
      expect(() =>
        validator.validateLlmSuggestions(
          [
            {
              title: 'Tarefa',
              description: 'a'.repeat(2001),
              dueDate: null,
            },
          ],
          movingDate,
        ),
      ).toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when dueDate is invalid', () => {
      expect(() =>
        validator.validateLlmSuggestions(
          [
            {
              title: 'Tarefa',
              description: null,
              dueDate: '2026-02-31',
            },
          ],
          movingDate,
        ),
      ).toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when dueDate is after the movingDate', () => {
      expect(() =>
        validator.validateLlmSuggestions(
          [
            {
              title: 'Tarefa',
              description: null,
              dueDate: '2026-12-05',
            },
          ],
          movingDate,
        ),
      ).toThrow(BadGatewayException);
    });
  });
});
