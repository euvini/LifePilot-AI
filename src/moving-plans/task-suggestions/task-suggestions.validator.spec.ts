import { BadGatewayException } from '@nestjs/common';
import {
  classifyTaskDomain,
  ContextDimension,
  ContextState,
  extractDimensionContext,
  extractHomeOfficeContext,
  extractMovingPlanContext,
  extractPetsContext,
  extractPlantsContext,
  extractStudentContext,
  filterCompatibleSuggestions,
  isTaskCompatibleWithContext,
  isValidCalendarDate,
  MovingPlanContextInput,
  normalizePtBrText,
  normalizeSuggestionPtBr,
  TaskDomain,
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
    const referenceDate = '2026-11-01';
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

      const result = validator.validateLlmSuggestions(
        raw,
        movingDate,
        referenceDate,
      );

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

    it('accepts suggestion with dueDate exactly equal to referenceDate', () => {
      const raw = [
        {
          title: 'Definir orçamento',
          description: null,
          dueDate: referenceDate,
        },
      ];

      const result = validator.validateLlmSuggestions(
        raw,
        movingDate,
        referenceDate,
      );

      expect(result[0].dueDate).toBe(referenceDate);
    });

    it('accepts suggestion with dueDate exactly equal to movingDate', () => {
      const raw = [
        {
          title: 'Vistoria final e entrega de chaves',
          description: null,
          dueDate: movingDate,
        },
      ];

      const result = validator.validateLlmSuggestions(
        raw,
        movingDate,
        referenceDate,
      );

      expect(result[0].dueDate).toBe(movingDate);
    });

    it('accepts suggestion with null dueDate', () => {
      const raw = [
        {
          title: 'Pesquisar bairros',
          description: null,
          dueDate: null,
        },
      ];

      const result = validator.validateLlmSuggestions(
        raw,
        movingDate,
        referenceDate,
      );

      expect(result[0].dueDate).toBeNull();
    });

    it('throws BadGatewayException when dueDate is before referenceDate', () => {
      expect(() =>
        validator.validateLlmSuggestions(
          [
            {
              title: 'Tarefa no passado',
              description: null,
              dueDate: '2026-10-31',
            },
          ],
          movingDate,
          referenceDate,
        ),
      ).toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when raw suggestions is empty or not an array', () => {
      expect(() =>
        validator.validateLlmSuggestions([], movingDate, referenceDate),
      ).toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when suggestions exceed maxLimit', () => {
      const raw = Array.from({ length: 21 }, (_, i) => ({
        title: `Tarefa ${i + 1}`,
        description: null,
        dueDate: null,
      }));

      expect(() =>
        validator.validateLlmSuggestions(raw, movingDate, referenceDate, 20),
      ).toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when title is missing or empty', () => {
      expect(() =>
        validator.validateLlmSuggestions(
          [{ title: '', description: null, dueDate: null }],
          movingDate,
          referenceDate,
        ),
      ).toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when title exceeds 200 characters', () => {
      expect(() =>
        validator.validateLlmSuggestions(
          [{ title: 'a'.repeat(201), description: null, dueDate: null }],
          movingDate,
          referenceDate,
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
          referenceDate,
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
          referenceDate,
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
          referenceDate,
        ),
      ).toThrow(BadGatewayException);
    });

    it('normalizes PT-BR terminology in title and description while leaving dueDate intact', () => {
      const raw = [
        {
          title: 'Decluttering dos armários na nova morada',
          description:
            'Alugar carrinha e comprar material de packing para pacotar os livros.',
          dueDate: '2026-11-20',
        },
      ];

      const result = validator.validateLlmSuggestions(
        raw,
        movingDate,
        referenceDate,
      );

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Desapego dos armários no novo endereço');
      expect(result[0].description).toBe(
        'Alugar van de frete e comprar material de embalagem para embalar os livros.',
      );
      expect(result[0].dueDate).toBe('2026-11-20');
    });
  });

  describe('normalizePtBrText', () => {
    describe('authorized substitutions', () => {
      it('replaces "decluttering" with "desapego" preserving case', () => {
        expect(normalizePtBrText('Fazer decluttering no quarto')).toBe(
          'Fazer desapego no quarto',
        );
        expect(normalizePtBrText('Decluttering de roupas')).toBe(
          'Desapego de roupas',
        );
        expect(normalizePtBrText('FAZER DECLUTTERING URGENTE')).toBe(
          'FAZER DESAPEGO URGENTE',
        );
      });

      it('replaces "declutar" and its inflections with "desapegar"', () => {
        expect(normalizePtBrText('Hora de declutar itens antigos')).toBe(
          'Hora de desapegar itens antigos',
        );
        expect(normalizePtBrText('Estamos declutando a despensa')).toBe(
          'Estamos desapegando a despensa',
        );
        expect(normalizePtBrText('Tudo já foi declutado')).toBe(
          'Tudo já foi desapegado',
        );
        expect(normalizePtBrText('Declutar antes de empacotar')).toBe(
          'Desapegar antes de empacotar',
        );
      });

      it('replaces "pacotar" and its inflections with "embalar"', () => {
        expect(normalizePtBrText('Pacotar louças frágeis')).toBe(
          'Embalar louças frágeis',
        );
        expect(normalizePtBrText('Pacotando os livros')).toBe(
          'Embalando os livros',
        );
        expect(normalizePtBrText('Pertences pacotados nas caixas')).toBe(
          'Pertences embalados nas caixas',
        );
      });

      it('replaces "carrinha" and "carrinhas" with "van de frete" and "vans de frete"', () => {
        expect(normalizePtBrText('Alugar carrinha de mudanças')).toBe(
          'Alugar van de frete de mudanças',
        );
        expect(normalizePtBrText('Carrinha com motorista')).toBe(
          'Van de frete com motorista',
        );
        expect(normalizePtBrText('Duas carrinhas necessárias')).toBe(
          'Duas vans de frete necessárias',
        );
      });

      it('replaces "morada" and "moradas" with gender-aware Portuguese contractions', () => {
        expect(normalizePtBrText('Chegada na nova morada')).toBe(
          'Chegada no novo endereço',
        );
        expect(normalizePtBrText('Chaves da nova morada')).toBe(
          'Chaves do novo endereço',
        );
        expect(normalizePtBrText('Visita à nova morada')).toBe(
          'Visita ao novo endereço',
        );
        expect(normalizePtBrText('Verificar a nova morada')).toBe(
          'Verificar o novo endereço',
        );
        expect(normalizePtBrText('Nova morada')).toBe(
          'Novo endereço',
        );
        expect(normalizePtBrText('Alteração de morada')).toBe(
          'Alteração de endereço',
        );
        expect(normalizePtBrText('Entrega na morada principal')).toBe(
          'Entrega no endereço principal',
        );
        expect(normalizePtBrText('Lista das moradas')).toBe(
          'Lista dos endereços',
        );
      });

      it('normalizes "packing" contextually and safely', () => {
        // Direct object following verbal "packing" -> "embalar"
        expect(normalizePtBrText('Packing as caixas')).toBe('Embalar as caixas');
        expect(normalizePtBrText('Packing os pertences')).toBe(
          'Embalar os pertences',
        );
        expect(normalizePtBrText('Packing a louça')).toBe('Embalar a louça');
        expect(normalizePtBrText('Packing o quarto')).toBe('Embalar o quarto');

        // Phrasal "fazer packing" -> "fazer a embalagem"
        expect(normalizePtBrText('Fazer packing da sala')).toBe(
          'Fazer a embalagem da sala',
        );
        expect(normalizePtBrText('FAZER PACKING DA SALA')).toBe(
          'FAZER A EMBALAGEM DA SALA',
        );

        // Noun/preposition phrase -> "embalagem"
        expect(normalizePtBrText('Material de packing')).toBe(
          'Material de embalagem',
        );
        expect(normalizePtBrText('Packing de roupas')).toBe(
          'Embalagem de roupas',
        );
        expect(normalizePtBrText('Etapa de packing')).toBe('Etapa de embalagem');
      });
    });

    describe('preservation of loanwords and technical terms', () => {
      it('preserves technical loanwords intact', () => {
        expect(normalizePtBrText('Fazer backup dos arquivos do notebook')).toBe(
          'Fazer backup dos arquivos do notebook',
        );
        expect(normalizePtBrText('Instalar Wi-Fi no home office')).toBe(
          'Instalar Wi-Fi no home office',
        );
        expect(normalizePtBrText('Montar kit de primeiros socorros')).toBe(
          'Montar kit de primeiros socorros',
        );
      });
    });

    describe('word boundary protection', () => {
      it('does not replace substrings inside other words', () => {
        expect(normalizePtBrText('Avisar a namorada sobre a data')).toBe(
          'Avisar a namorada sobre a data',
        );
        expect(normalizePtBrText('Viagem demorada pelo trânsito')).toBe(
          'Viagem demorada pelo trânsito',
        );
        expect(normalizePtBrText('Auxílio moradia da universidade')).toBe(
          'Auxílio moradia da universidade',
        );
        expect(normalizePtBrText('Comprar pacote de internet')).toBe(
          'Comprar pacote de internet',
        );
        expect(normalizePtBrText('Empacotar as louças')).toBe(
          'Empacotar as louças',
        );
      });
    });

    describe('punctuation, accents and edge cases', () => {
      it('preserves punctuation and surrounding characters', () => {
        expect(
          normalizePtBrText('Atenção: "Decluttering" no quarto — urgente!'),
        ).toBe('Atenção: "Desapego" no quarto — urgente!');
      });

      it('handles null, undefined, empty and whitespace strings safely', () => {
        expect(normalizePtBrText('')).toBe('');
        // @ts-expect-error testing invalid runtime inputs
        expect(normalizePtBrText(null)).toBeNull();
        // @ts-expect-error testing invalid runtime inputs
        expect(normalizePtBrText(undefined)).toBeUndefined();
      });
    });

    describe('idempotence', () => {
      it('satisfies f(f(x)) === f(x) for all test cases', () => {
        const samples = [
          'Fazer decluttering na nova morada com carrinha e material de packing.',
          'Packing as caixas para a nova morada com a namorada.',
          'Pacotar todos os livros e declutar a garagem com paciência.',
          'FAZER PACKING URGENTE NA MORADA',
          'Fazer backup do notebook no home office com Wi-Fi estável.',
          'Viagem demorada para conferir moradia e pacote contratado.',
        ];

        for (const sample of samples) {
          const firstPass = normalizePtBrText(sample);
          const secondPass = normalizePtBrText(firstPass);
          expect(secondPass).toBe(firstPass);
        }
      });
    });
  });

  describe('normalizeSuggestionPtBr', () => {
    it('normalizes title and description while keeping other fields untouched', () => {
      const item = {
        title: 'Decluttering pré-mudança',
        description: 'Alugar carrinha e pacotar pertences.',
        dueDate: '2026-11-15',
        customMeta: 123,
      };

      const normalized = normalizeSuggestionPtBr(item);

      expect(normalized).toEqual({
        title: 'Desapego pré-mudança',
        description: 'Alugar van de frete e embalar pertences.',
        dueDate: '2026-11-15',
        customMeta: 123,
      });
    });

    it('handles null description without throwing', () => {
      const item = {
        title: 'Decluttering dos pertences',
        description: null,
      };

      const normalized = normalizeSuggestionPtBr(item);
      expect(normalized.title).toBe('Desapego dos pertences');
      expect(normalized.description).toBeNull();
    });
  });

  describe('P3.2 — Tri-State Context Extraction', () => {
    describe('1. Cada dimensão em PRESENTE', () => {
      it('classifies PETS as PRESENTE when explicitly affirmed', () => {
        expect(extractPetsContext('Mudança com dois cães')).toBe(
          ContextState.PRESENTE,
        );
        expect(extractPetsContext('Apartamento com gatos e cachorro')).toBe(
          ContextState.PRESENTE,
        );
        expect(extractPetsContext('Mudança familiar com animais de estimação')).toBe(
          ContextState.PRESENTE,
        );
        expect(extractPetsContext('Mudança levando meu pet e aquário')).toBe(
          ContextState.PRESENTE,
        );
      });

      it('classifies PLANTS as PRESENTE when explicitly affirmed', () => {
        expect(extractPlantsContext('Apartamento com plantas')).toBe(
          ContextState.PRESENTE,
        );
        expect(extractPlantsContext('Casa com jardim e horta caseira')).toBe(
          ContextState.PRESENTE,
        );
        expect(
          extractPlantsContext('Mudança com vasos de plantas e orquídeas'),
        ).toBe(ContextState.PRESENTE);
        expect(extractPlantsContext('Mudança com suculentas e mudas')).toBe(
          ContextState.PRESENTE,
        );
      });

      it('classifies HOME_OFFICE as PRESENTE when explicitly affirmed', () => {
        expect(
          extractHomeOfficeContext('Mudança com escritório em casa'),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractHomeOfficeContext('Mudança residencial com home office'),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractHomeOfficeContext(
            'Mudança com equipamentos de TI e estação de trabalho',
          ),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractHomeOfficeContext('Mudança para trabalho remoto e teletrabalho'),
        ).toBe(ContextState.PRESENTE);
      });

      it('classifies STUDENT as PRESENTE when explicitly affirmed', () => {
        expect(
          extractStudentContext('Mudança de estudante universitário'),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractStudentContext('Mudança para alojamento universitário'),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractStudentContext('Mudança para república estudantil com livros acadêmicos'),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractStudentContext('Mudança de calouro com materiais acadêmicos'),
        ).toBe(ContextState.PRESENTE);
      });
    });

    describe('2. Cada dimensão em AUSENTE (Negação explícita)', () => {
      it('classifies PETS as AUSENTE when explicitly negated', () => {
        expect(extractPetsContext('Mudança sem animais')).toBe(
          ContextState.AUSENTE,
        );
        expect(extractPetsContext('Mudança sem cães nem gatos')).toBe(
          ContextState.AUSENTE,
        );
        expect(extractPetsContext('Não tenho animais de estimação')).toBe(
          ContextState.AUSENTE,
        );
        expect(extractPetsContext('Apartamento onde animais não são permitidos')).toBe(
          ContextState.AUSENTE,
        );
        expect(extractPetsContext('Mudança com zero pets')).toBe(
          ContextState.AUSENTE,
        );
      });

      it('classifies PLANTS as AUSENTE when explicitly negated', () => {
        expect(extractPlantsContext('Não tenho plantas')).toBe(
          ContextState.AUSENTE,
        );
        expect(extractPlantsContext('Mudança sem plantas e sem jardim')).toBe(
          ContextState.AUSENTE,
        );
        expect(extractPlantsContext('Apartamento sem espaço para plantas')).toBe(
          ContextState.AUSENTE,
        );
        expect(extractPlantsContext('Não levarei vasos de plantas')).toBe(
          ContextState.AUSENTE,
        );
      });

      it('classifies HOME_OFFICE as AUSENTE when explicitly negated', () => {
        expect(extractHomeOfficeContext('Não haverá home office')).toBe(
          ContextState.AUSENTE,
        );
        expect(extractHomeOfficeContext('Mudança sem escritório em casa')).toBe(
          ContextState.AUSENTE,
        );
        expect(
          extractHomeOfficeContext('Mudança sem equipamentos de TI'),
        ).toBe(ContextState.AUSENTE);
        expect(
          extractHomeOfficeContext('Não trabalho em casa'),
        ).toBe(ContextState.AUSENTE);
      });

      it('classifies STUDENT as AUSENTE when explicitly negated', () => {
        expect(extractStudentContext('Não sou estudante')).toBe(
          ContextState.AUSENTE,
        );
        expect(extractStudentContext('Mudança sem materiais acadêmicos')).toBe(
          ContextState.AUSENTE,
        );
        expect(
          extractStudentContext('Não é uma mudança de estudante'),
        ).toBe(ContextState.AUSENTE);
        expect(
          extractStudentContext('Mudança familiar, sem estudante'),
        ).toBe(ContextState.AUSENTE);
      });
    });

    describe('3. Cada dimensão em DESCONHECIDO (Omissão nunca implica ausência)', () => {
      it('classifies all dimensions as DESCONHECIDO when omitted', () => {
        expect(extractMovingPlanContext('Mudança de apartamento T2')).toEqual({
          pets: ContextState.DESCONHECIDO,
          plants: ContextState.DESCONHECIDO,
          homeOffice: ContextState.DESCONHECIDO,
          student: ContextState.DESCONHECIDO,
        });

        expect(
          extractMovingPlanContext('Mudança de Porto para Lisboa'),
        ).toEqual({
          pets: ContextState.DESCONHECIDO,
          plants: ContextState.DESCONHECIDO,
          homeOffice: ContextState.DESCONHECIDO,
          student: ContextState.DESCONHECIDO,
        });

        expect(
          extractMovingPlanContext('Mudança urgente de casa com 3 quartos'),
        ).toEqual({
          pets: ContextState.DESCONHECIDO,
          plants: ContextState.DESCONHECIDO,
          homeOffice: ContextState.DESCONHECIDO,
          student: ContextState.DESCONHECIDO,
        });
      });

      it('returns DESCONHECIDO for empty or whitespace titles', () => {
        expect(extractMovingPlanContext('')).toEqual({
          pets: ContextState.DESCONHECIDO,
          plants: ContextState.DESCONHECIDO,
          homeOffice: ContextState.DESCONHECIDO,
          student: ContextState.DESCONHECIDO,
        });
        expect(extractMovingPlanContext('   ')).toEqual({
          pets: ContextState.DESCONHECIDO,
          plants: ContextState.DESCONHECIDO,
          homeOffice: ContextState.DESCONHECIDO,
          student: ContextState.DESCONHECIDO,
        });
      });
    });

    describe('4. Variações de capitalização e acentuação', () => {
      it('handles uppercase, lowercase, and mixed case consistently', () => {
        expect(extractPetsContext('MUDANÇA COM DOIS CÃES')).toBe(
          ContextState.PRESENTE,
        );
        expect(extractPetsContext('mudança sem animais')).toBe(
          ContextState.AUSENTE,
        );
        expect(extractHomeOfficeContext('NÃO HAVERÁ HOME OFFICE')).toBe(
          ContextState.AUSENTE,
        );
        expect(
          extractStudentContext('Mudança De Estudante Universitário'),
        ).toBe(ContextState.PRESENTE);
      });

      it('handles accented and unaccented text identically', () => {
        expect(extractPetsContext('Mudanca com dois caes')).toBe(
          ContextState.PRESENTE,
        );
        expect(extractPlantsContext('Nao tenho plantas')).toBe(
          ContextState.AUSENTE,
        );
        expect(
          extractHomeOfficeContext('Mudanca com escritorio em casa'),
        ).toBe(ContextState.PRESENTE);
        expect(extractHomeOfficeContext('Nao havera home office')).toBe(
          ContextState.AUSENTE,
        );
        expect(
          extractStudentContext('Mudanca de estudante universitario com materiais academicos'),
        ).toBe(ContextState.PRESENTE);
        expect(extractStudentContext('Nao sou estudante')).toBe(
          ContextState.AUSENTE,
        );
      });
    });

    describe('5. Expressões ambíguas, incertezas e referências indiretas', () => {
      it('returns DESCONHECIDO when expressions indicate uncertainty or doubt', () => {
        expect(extractPlantsContext('Mudança talvez com plantas')).toBe(
          ContextState.DESCONHECIDO,
        );
        expect(extractPetsContext('Dúvida sobre levar os cães na mudança')).toBe(
          ContextState.DESCONHECIDO,
        );
        expect(
          extractHomeOfficeContext('Mudança com possível home office'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractHomeOfficeContext('Mudança: home office ainda não definido'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractHomeOfficeContext('Mudança sem confirmação de home office'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractPetsContext('Não sei se levo animais para o apartamento'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractPlantsContext('Não descarto levar plantas'),
        ).toBe(ContextState.DESCONHECIDO);
      });

      it('returns DESCONHECIDO for architectural/toponymic false friends and indirect references', () => {
        // Architectural / floor plan uses of "planta"
        expect(
          extractPlantsContext('Mudança para apartamento comprado na planta'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractPlantsContext('Mudança com planta baixa do imóvel'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractPlantsContext('Conferir planta elétrica do apartamento'),
        ).toBe(ContextState.DESCONHECIDO);

        // Toponyms and neighborhoods with "Jardim" or "Plantas"
        expect(
          extractPlantsContext('Mudança para o bairro Jardim Botânico'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractPlantsContext('Mudança para Jardim Paulista'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractPlantsContext('Mudança para a Rua das Plantas'),
        ).toBe(ContextState.DESCONHECIDO);

        // Indirect proximity to veterinary / office / university
        expect(
          extractPetsContext('Mudança perto do hospital veterinário'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractPetsContext('Mudança ao lado do pet shop'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractHomeOfficeContext('Mudança perto do escritório da empresa'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractHomeOfficeContext('Mudança para ficar mais perto do escritório'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractStudentContext('Mudança próxima à universidade'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractStudentContext('Mudança ao lado da faculdade'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractStudentContext('Mudança perto do Hospital Universitário'),
        ).toBe(ContextState.DESCONHECIDO);

        // Other false friends ("vaso sanitário", "gato de luz", "Praça da República")
        expect(
          extractPlantsContext('Mudança com troca de vaso sanitário'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractPetsContext('Verificar gato de energia no imóvel'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractStudentContext('Mudança para a Praça da República'),
        ).toBe(ContextState.DESCONHECIDO);
      });

      it('returns DESCONHECIDO when the same dimension has contradictory statements', () => {
        expect(
          extractPetsContext('Mudança com cães, mas sem cães'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractPetsContext('Mudança com cães, sem animais'),
        ).toBe(ContextState.DESCONHECIDO);
        expect(
          extractHomeOfficeContext('Mudança com home office, sem home office'),
        ).toBe(ContextState.DESCONHECIDO);
      });

      it('handles complementary sub-terms without false contradiction', () => {
        expect(
          extractPetsContext('Mudança com dois cães e sem gatos'),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractPetsContext('Mudança com cães, sem outros animais'),
        ).toBe(ContextState.PRESENTE);
      });
    });

    describe('6. Negação com escopo incorreto (Isolamento de escopo)', () => {
      it('does not let negation of an unrelated noun spill over to a positive dimension', () => {
        expect(
          extractPetsContext('Mudança sem pressa com dois cães'),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractPetsContext('Mudança com dois cães sem pressa'),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractPlantsContext('Não tenho pressa na mudança com plantas'),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractStudentContext('Mudança sem elevador para estudante universitário'),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractHomeOfficeContext('Mudança sem móveis pesados, com home office'),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractStudentContext(
            'Mudança de estudante que não vai contratar transportadora',
          ),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractStudentContext('Não tenho fiador e sou estudante'),
        ).toBe(ContextState.PRESENTE);
      });

      it('does not classify non-existential "não só / não esquecer" as AUSENTE', () => {
        expect(
          extractPetsContext('Mudança: não esquecer de levar os cães'),
        ).toBe(ContextState.PRESENTE);
        expect(
          extractStudentContext('Mudança não só para estudante, mas com home office'),
        ).toBe(ContextState.PRESENTE);
      });
    });

    describe('7. Títulos com mais de uma dimensão e independência entre dimensões', () => {
      it('extracts multiple dimensions accurately from complex titles', () => {
        const ctx1 = extractMovingPlanContext(
          'Mudança de estudante universitário com dois cães e plantas, mas sem home office',
        );
        expect(ctx1).toEqual({
          pets: ContextState.PRESENTE,
          plants: ContextState.PRESENTE,
          homeOffice: ContextState.AUSENTE,
          student: ContextState.PRESENTE,
        });

        const ctx2 = extractMovingPlanContext(
          'Mudança sem animais e sem plantas, com escritório em casa',
        );
        expect(ctx2).toEqual({
          pets: ContextState.AUSENTE,
          plants: ContextState.AUSENTE,
          homeOffice: ContextState.PRESENTE,
          student: ContextState.DESCONHECIDO,
        });

        const ctx3 = extractMovingPlanContext(
          'Mudança sem animais nem plantas para quarto universitário',
        );
        expect(ctx3).toEqual({
          pets: ContextState.AUSENTE,
          plants: ContextState.AUSENTE,
          homeOffice: ContextState.DESCONHECIDO,
          student: ContextState.PRESENTE,
        });
      });

      it('guarantees complete independence between dimensions', () => {
        const title = 'Mudança com home office e sem animais';
        expect(extractDimensionContext(title, ContextDimension.PETS)).toBe(
          ContextState.AUSENTE,
        );
        expect(extractDimensionContext(title, ContextDimension.PLANTS)).toBe(
          ContextState.DESCONHECIDO,
        );
        expect(
          extractDimensionContext(title, ContextDimension.HOME_OFFICE),
        ).toBe(ContextState.PRESENTE);
        expect(extractDimensionContext(title, ContextDimension.STUDENT)).toBe(
          ContextState.DESCONHECIDO,
        );

        expect(validator.extractPlanContext(title)).toEqual({
          pets: ContextState.AUSENTE,
          plants: ContextState.DESCONHECIDO,
          homeOffice: ContextState.PRESENTE,
          student: ContextState.DESCONHECIDO,
        });
      });
    });

    describe('8. Determinismo, imutabilidade e ausência de descarte semântico', () => {
      it('is 100% deterministic across repeated invocations', () => {
        const input =
          'Mudança com dois cães, sem plantas, com home office para estudante';
        const baseline = extractMovingPlanContext(input);

        for (let i = 0; i < 25; i++) {
          expect(extractMovingPlanContext(input)).toEqual(baseline);
        }
      });

      it('does not mutate the input object and returns a frozen context object', () => {
        const inputObj: MovingPlanContextInput = {
          title: 'Mudança com dois cães e sem plantas',
          origin: 'Porto',
          destination: 'Lisboa',
        };
        const snapshot = { ...inputObj };

        const result = extractMovingPlanContext(inputObj);

        expect(inputObj).toEqual(snapshot);
        expect(Object.isFrozen(result)).toBe(true);
      });

      it('does NOT discard or filter any task suggestions even when dimensions are AUSENTE', () => {
        const planTitle =
          'Mudança sem animais, sem plantas, sem home office e não sou estudante';
        const extracted = validator.extractPlanContext(planTitle);
        expect(extracted).toEqual({
          pets: ContextState.AUSENTE,
          plants: ContextState.AUSENTE,
          homeOffice: ContextState.AUSENTE,
          student: ContextState.AUSENTE,
        });

        const rawSuggestions = [
          {
            title: 'Agendar consulta com veterinário para os cães',
            description: 'Atualizar vacinas dos pets antes da viagem',
            dueDate: '2026-11-10',
          },
          {
            title: 'Preparar vasos de plantas e podar o jardim',
            description: 'Acondicionar mudas e orquídeas',
            dueDate: '2026-11-12',
          },
          {
            title: 'Fazer backup do servidor de TI no home office',
            description: 'Desmontar estação de trabalho e cabos de rede',
            dueDate: '2026-11-15',
          },
          {
            title: 'Separar materiais acadêmicos da faculdade',
            description: 'Encaixotar livros universitários',
            dueDate: '2026-11-18',
          },
        ];

        const validated = validator.validateLlmSuggestions(
          rawSuggestions,
          '2026-12-01',
          '2026-11-01',
        );

        expect(validated).toHaveLength(4);
        expect(validated).toEqual(rawSuggestions);
      });
    });
  });

  describe('P3.3 — Deterministic Semantic Compatibility Filter', () => {
    const petTask = {
      title: 'Agendar consulta com veterinário e atualizar vacinas dos cães',
      description: 'Garantir atestado veterinário e caixa de transporte do pet',
      dueDate: '2026-11-10',
    };
    const plantTask = {
      title: 'Preparar vasos de plantas e podar o jardim',
      description: 'Regar as mudas e acondicionar as orquídeas para o transporte',
      dueDate: '2026-11-12',
    };
    const homeOfficeTask = {
      title: 'Fazer backup dos servidores de TI e desmontar home office',
      description: 'Identificar cabeamento estruturado da estação de trabalho',
      dueDate: '2026-11-15',
    };
    const studentTask = {
      title: 'Confirmar matrícula e atualizar endereço na secretaria da faculdade',
      description: 'Separar materiais acadêmicos e livros universitários',
      dueDate: '2026-11-18',
    };
    const genericTask = {
      title: 'Contratar caminhão de mudança e providenciar caixas de papelão',
      description: 'Transferir contas de água, luz e internet e separar itens para doação',
      dueDate: '2026-11-20',
    };

    describe('1. Cada dimensão AUSENTE com tarefas especializadas incompatíveis', () => {
      it('discards PETS tasks when pets dimension is AUSENTE', () => {
        const filtered = filterCompatibleSuggestions(
          [petTask, genericTask],
          'Mudança sem animais',
        );
        expect(filtered).toEqual([genericTask]);
      });

      it('discards PLANTS tasks when plants dimension is AUSENTE', () => {
        const filtered = filterCompatibleSuggestions(
          [plantTask, genericTask],
          'Não tenho plantas nem jardim',
        );
        expect(filtered).toEqual([genericTask]);
      });

      it('discards HOME_OFFICE tasks when homeOffice dimension is AUSENTE', () => {
        const filtered = filterCompatibleSuggestions(
          [homeOfficeTask, genericTask],
          'Não haverá home office',
        );
        expect(filtered).toEqual([genericTask]);
      });

      it('discards STUDENT tasks when student dimension is AUSENTE', () => {
        const filtered = filterCompatibleSuggestions(
          [studentTask, genericTask],
          'Não sou estudante',
        );
        expect(filtered).toEqual([genericTask]);
      });
    });

    describe('2. Cada dimensão PRESENTE com tarefas compatíveis preservadas', () => {
      it('preserves PETS tasks when pets dimension is PRESENTE', () => {
        const filtered = filterCompatibleSuggestions(
          [petTask, genericTask],
          'Mudança com dois cães',
        );
        expect(filtered).toEqual([petTask, genericTask]);
      });

      it('preserves PLANTS tasks when plants dimension is PRESENTE', () => {
        const filtered = filterCompatibleSuggestions(
          [plantTask, genericTask],
          'Apartamento com plantas e jardim',
        );
        expect(filtered).toEqual([plantTask, genericTask]);
      });

      it('preserves HOME_OFFICE tasks when homeOffice dimension is PRESENTE', () => {
        const filtered = filterCompatibleSuggestions(
          [homeOfficeTask, genericTask],
          'Mudança com escritório em casa e equipamentos de TI',
        );
        expect(filtered).toEqual([homeOfficeTask, genericTask]);
      });

      it('preserves STUDENT tasks when student dimension is PRESENTE', () => {
        const filtered = filterCompatibleSuggestions(
          [studentTask, genericTask],
          'Mudança de estudante universitário',
        );
        expect(filtered).toEqual([studentTask, genericTask]);
      });
    });

    describe('3. Cada dimensão DESCONHECIDA com tarefas preservadas', () => {
      it('preserves all specialized tasks when plan context is DESCONHECIDO', () => {
        const allTasks = [
          petTask,
          plantTask,
          homeOfficeTask,
          studentTask,
          genericTask,
        ];
        const filtered = filterCompatibleSuggestions(
          allTasks,
          'Mudança de apartamento T2 de Porto para Lisboa',
        );
        expect(filtered).toEqual(allTasks);
      });
    });

    describe('4. Preservação de tarefas genéricas, falsos amigos e interpretações ambíguas', () => {
      const allAbsentPlan =
        'Mudança sem animais, sem plantas, sem home office e não sou estudante';

      it('preserves generic logistics tasks even when all dimensions are AUSENTE', () => {
        const genericTasks = [
          {
            title: 'Separar roupas e móveis para doação e desapego',
            description: 'Organizar itens que não serão levados',
            dueDate: '2026-11-05',
          },
          {
            title: 'Providenciar caixas de papelão, fita adesiva e plástico-bolha',
            description: 'Embalar louças e pertences frágeis',
            dueDate: '2026-11-10',
          },
          {
            title: 'Solicitar transferência de água, luz e internet',
            description: 'Atualizar endereço nas concessionárias e condomínio',
            dueDate: '2026-11-15',
          },
          {
            title: 'Contratar transportadora ou caminhão de mudança',
            description: 'Comparar orçamentos de frete',
            dueDate: '2026-11-18',
          },
        ];

        const filtered = filterCompatibleSuggestions(
          genericTasks,
          allAbsentPlan,
        );
        expect(filtered).toEqual(genericTasks);
      });

      it('preserves architectural false friends like "planta baixa do imóvel"', () => {
        const floorPlanTasks = [
          {
            title: 'Solicitar planta baixa do imóvel para planejar os móveis',
            description: 'Conferir medidas na planta do novo apartamento',
            dueDate: '2026-11-08',
          },
          {
            title: 'Verificar planta elétrica e hidráulica da casa',
            description: 'Checar tomadas antes da mudança',
            dueDate: '2026-11-09',
          },
          {
            title: 'Higienizar vasos sanitários dos banheiros',
            description: 'Limpeza profunda antes da entrada',
            dueDate: '2026-11-22',
          },
        ];

        for (const task of floorPlanTasks) {
          expect(classifyTaskDomain(task)).toBe(TaskDomain.GENERIC);
          expect(isTaskCompatibleWithContext(task, allAbsentPlan)).toBe(true);
        }
        expect(
          filterCompatibleSuggestions(floorPlanTasks, allAbsentPlan),
        ).toEqual(floorPlanTasks);
      });

      it('preserves personal clothing and personal document backup tasks', () => {
        const personalBackupTasks = [
          {
            title: 'Preparar mala de backup com roupas para os primeiros dias',
            description: 'Incluir itens de higiene pessoal e medicamentos',
            dueDate: '2026-11-25',
          },
          {
            title: 'Fazer backup de documentos pessoais, RG, CPF e contratos',
            description: 'Guardar cópias digitais de fotos de família e certidões',
            dueDate: '2026-11-14',
          },
        ];

        for (const task of personalBackupTasks) {
          expect(classifyTaskDomain(task)).toBe(TaskDomain.GENERIC);
          expect(isTaskCompatibleWithContext(task, allAbsentPlan)).toBe(true);
        }
        expect(
          filterCompatibleSuggestions(personalBackupTasks, allAbsentPlan),
        ).toEqual(personalBackupTasks);
      });

      it('preserves mentions of law offices, accounting offices, and real estate offices', () => {
        const officeTasks = [
          {
            title: 'Entregar contrato assinado no escritório de advocacia',
            description: 'Validar cláusulas jurídicas da locação',
            dueDate: '2026-11-06',
          },
          {
            title: 'Retirar chaves no escritório da imobiliária',
            description: 'Assinar termo de vistoria no escritório imobiliário',
            dueDate: '2026-11-28',
          },
          {
            title: 'Enviar comprovante ao escritório de contabilidade',
            description: 'Atualizar cadastro fiscal',
            dueDate: '2026-11-19',
          },
        ];

        for (const task of officeTasks) {
          expect(classifyTaskDomain(task)).toBe(TaskDomain.GENERIC);
          expect(isTaskCompatibleWithContext(task, allAbsentPlan)).toBe(true);
        }
        expect(filterCompatibleSuggestions(officeTasks, allAbsentPlan)).toEqual(
          officeTasks,
        );
      });

      it('preserves mentions of university as a geographic landmark', () => {
        const geoUniversityTasks = [
          {
            title: 'Verificar trânsito e rotas perto da universidade',
            description: 'Evitar horário de pico da universidade no dia da mudança',
            dueDate: '2026-11-27',
          },
          {
            title: 'Mapear supermercados próximos à faculdade',
            description: 'Conhecer o comércio ao lado da universidade',
            dueDate: '2026-11-29',
          },
        ];

        for (const task of geoUniversityTasks) {
          expect(classifyTaskDomain(task)).toBe(TaskDomain.GENERIC);
          expect(isTaskCompatibleWithContext(task, allAbsentPlan)).toBe(true);
        }
        expect(
          filterCompatibleSuggestions(geoUniversityTasks, allAbsentPlan),
        ).toEqual(geoUniversityTasks);
      });

      it('preserves tasks with ambiguous interpretation', () => {
        const ambiguousTasks = [
          {
            title: 'Fazer backup geral antes da mudança',
            description: 'Garantir segurança das informações importantes',
            dueDate: '2026-11-12',
          },
          {
            title: 'Analisar a planta com a equipe de mudança',
            description: 'Definir disposição de cada cômodo',
            dueDate: '2026-11-16',
          },
          {
            title: 'Confirmar horário de atendimento no escritório',
            description: 'Ligar com antecedência para agendar entrega',
            dueDate: '2026-11-17',
          },
          {
            title: 'Embalar livros da estante da sala em caixas pequenas',
            description: 'Evitar peso excessivo nas caixas de papelão',
            dueDate: '2026-11-19',
          },
        ];

        for (const task of ambiguousTasks) {
          expect(classifyTaskDomain(task)).toBe(TaskDomain.GENERIC);
          expect(isTaskCompatibleWithContext(task, allAbsentPlan)).toBe(true);
        }
        expect(
          filterCompatibleSuggestions(ambiguousTasks, allAbsentPlan),
        ).toEqual(ambiguousTasks);
      });
    });

    describe('5. Múltiplas dimensões, plano totalmente AUSENTE, imutabilidade e ausência de substitutas', () => {
      it('handles multiple dimensions selectively in the same plan', () => {
        const planTitle =
          'Mudança com dois cães e home office, mas sem plantas e não sou estudante';
        const allTasks = [
          petTask,
          plantTask,
          homeOfficeTask,
          studentTask,
          genericTask,
        ];

        const filtered = filterCompatibleSuggestions(allTasks, planTitle);
        expect(filtered).toEqual([petTask, homeOfficeTask, genericTask]);
      });

      it('discards all 4 specialized domains when all dimensions are AUSENTE while keeping generic tasks', () => {
        const planTitle =
          'Mudança sem animais, sem plantas, sem home office e não sou estudante';
        const allTasks = [
          petTask,
          plantTask,
          homeOfficeTask,
          studentTask,
          genericTask,
        ];

        const filtered = filterCompatibleSuggestions(allTasks, planTitle);
        expect(filtered).toEqual([genericTask]);
      });

      it('returns an empty array without inventing replacement tasks when all tasks are discarded', () => {
        const planTitle = 'Mudança sem animais e sem plantas';
        const onlyIncompatible = [petTask, plantTask];

        const filtered = filterCompatibleSuggestions(
          onlyIncompatible,
          planTitle,
        );
        expect(filtered).toEqual([]);
      });

      it('preserves exact object references, fields and metadata of kept tasks (immutability)', () => {
        const taskWithMeta = {
          title: 'Contratar caminhão de mudança',
          description: 'Comparar 3 transportadoras',
          dueDate: '2026-11-15',
          extraMeta: { priority: 'high' },
        };
        const snapshot = structuredClone(taskWithMeta);

        const filtered = filterCompatibleSuggestions(
          [petTask, taskWithMeta],
          'Mudança sem animais',
        );

        expect(filtered).toHaveLength(1);
        expect(filtered[0]).toBe(taskWithMeta);
        expect(filtered[0]).toEqual(snapshot);
      });
    });

    describe('P3.5 Regression & Edge Cases', () => {
      describe('P3.5-A — Evitar falsos descartes do filtro semântico', () => {
        it('preserves academic material decluttering and donation in plan with student AUSENTE (B-16)', () => {
          const task = {
            title:
              'Separar livros acadêmicos antigos e apostilas da faculdade para doação',
            description:
              'Desapegar de materiais de estudo antigos que ocupam espaço no armário',
          };
          expect(classifyTaskDomain(task)).toBe(TaskDomain.GENERIC);
          expect(isTaskCompatibleWithContext(task, 'Não sou estudante')).toBe(
            true,
          );
        });

        it('preserves selling old study books at second-hand store in plan without student (B-16 variant)', () => {
          const task = {
            title: 'Vender apostilas e livros acadêmicos antigos no sebo',
            description: 'Liberar espaço antes de empacotar',
          };
          expect(classifyTaskDomain(task)).toBe(TaskDomain.GENERIC);
          expect(isTaskCompatibleWithContext(task, 'Não sou estudante')).toBe(
            true,
          );
        });

        it('discards actual academic requirement/enrollment tasks when student is AUSENTE (B-16 positive guard)', () => {
          const task = {
            title:
              'Entregar histórico escolar e validar grade curricular na faculdade',
            description: 'Concluir requisitos acadêmicos',
          };
          expect(classifyTaskDomain(task)).toBe(TaskDomain.STUDENT);
          expect(isTaskCompatibleWithContext(task, 'Não sou estudante')).toBe(
            false,
          );
        });

        it('preserves architectural floor plans when coordinated with projects/documents (B-17)', () => {
          const task = {
            title:
              'Separar as plantas e projetos de arquitetura do apartamento',
            description: 'Conferir medidas estruturais',
          };
          expect(classifyTaskDomain(task)).toBe(TaskDomain.GENERIC);
          expect(
            isTaskCompatibleWithContext(task, 'Não tenho plantas nem jardim'),
          ).toBe(true);
        });

        it('preserves architectural floor plans coordinated with property documents (B-17 variant)', () => {
          const task = {
            title: 'Revisar plantas e documentos do imóvel',
            description: 'Conferir instalações elétricas e hidráulicas',
          };
          expect(classifyTaskDomain(task)).toBe(TaskDomain.GENERIC);
          expect(isTaskCompatibleWithContext(task, 'Não tenho plantas')).toBe(
            true,
          );
        });

        it('discards actual botanical plant tasks coordinated with gardening actions when plants is AUSENTE (B-17 negative guard)', () => {
          const task = {
            title: 'Separar as plantas e regar os vasos',
            description: 'Hidratar as mudas antes da viagem',
          };
          expect(classifyTaskDomain(task)).toBe(TaskDomain.PLANTS);
          expect(isTaskCompatibleWithContext(task, 'Não tenho plantas')).toBe(
            false,
          );
        });
      });

      describe('P3.5-B — Corrigir normalização lexical PT-BR', () => {
        it('normalizes compound "packing list" expression to "lista de embalagem" (C-10)', () => {
          expect(
            normalizePtBrText('Preparar packing list detalhado das caixas'),
          ).toBe('Preparar lista de embalagem detalhada das caixas');
        });

        it('normalizes plural "packing lists" to "listas de embalagem" (C-10 variant)', () => {
          expect(
            normalizePtBrText('Organizar packing lists detalhados das caixas'),
          ).toBe('Organizar listas de embalagem detalhadas das caixas');
        });

        it('preserves capitalization on TitleCase and uppercase packing list (C-10 casing)', () => {
          expect(normalizePtBrText('Conferir o Packing List')).toBe(
            'Conferir a lista de embalagem',
          );
          expect(normalizePtBrText('PACKING LIST COMPLETO')).toBe(
            'LISTA DE EMBALAGEM COMPLETA',
          );
        });

        it('normalizes verbal "packing" followed by direct object nouns without article (C-11)', () => {
          expect(normalizePtBrText('Packing louças frágeis da cozinha')).toBe(
            'Embalar louças frágeis da cozinha',
          );
        });

        it('normalizes verbal "packing" with moving item variants and possessives (C-11 variants)', () => {
          expect(normalizePtBrText('Packing roupas e livros do quarto')).toBe(
            'Embalar roupas e livros do quarto',
          );
          expect(normalizePtBrText('Packing caixas e utensílios')).toBe(
            'Embalar caixas e utensílios',
          );
          expect(normalizePtBrText('Packing meus pertences pessoais')).toBe(
            'Embalar meus pertences pessoais',
          );
          expect(normalizePtBrText('Packing móveis da sala')).toBe(
            'Embalar móveis da sala',
          );
        });

        it('preserves nominal treatment for packing in substantival contexts (C-11 nominal)', () => {
          expect(normalizePtBrText('Comprar material de packing')).toBe(
            'Comprar material de embalagem',
          );
          expect(normalizePtBrText('Fita de packing para caixas')).toBe(
            'Fita de embalagem para caixas',
          );
        });

        it('preserves gender agreement with possessives and trailing adjectives in "morada" (C-12)', () => {
          expect(
            normalizePtBrText('Entregar caixas na sua morada atualizada'),
          ).toBe('Entregar caixas no seu endereço atualizado');
          expect(normalizePtBrText('Chegada na minha morada antiga')).toBe(
            'Chegada no meu endereço antigo',
          );
          expect(
            normalizePtBrText('Encaminhar para a nossa morada definitiva'),
          ).toBe('Encaminhar para o nosso endereço definitivo');
        });

        it('safely normalizes neutral expressions like "de morada" (C-12 neutral)', () => {
          expect(normalizePtBrText('Aviso de mudança de morada')).toBe(
            'Aviso de mudança de endereço',
          );
          expect(normalizePtBrText('Comprovante de morada atual')).toBe(
            'Comprovante de endereço atual',
          );
        });

        it('avoids producing ungrammatical combinations on unknown feminine constructions with morada (C-12 safe)', () => {
          const unknownPhrase = 'Morava em uma morada desconhecida';
          const normalized = normalizePtBrText(unknownPhrase);
          expect(normalized).not.toContain('uma endereço');
        });

        it('preserves initial capital in titles while normalizing loanwords (C-13)', () => {
          expect(
            normalizePtBrText('Fazer Packing da sala na Nova Morada'),
          ).toBe('Fazer a embalagem da sala no Novo Endereço');
          expect(normalizePtBrText('Decluttering de roupas do armário')).toBe(
            'Desapego de roupas do armário',
          );
          expect(normalizePtBrText('FAZER DECLUTTERING URGENTE')).toBe(
            'FAZER DESAPEGO URGENTE',
          );
        });

        it('maintains idempotency on normalized text (C-13 idempotency)', () => {
          const sample = 'Fazer a embalagem da sala no Novo Endereço';
          expect(normalizePtBrText(sample)).toBe(sample);
          expect(normalizePtBrText(normalizePtBrText(sample))).toBe(sample);
        });
      });

      describe('P3.5-C — Garantir limites após normalização (D-09)', () => {
        const referenceDate = '2026-11-01';
        const movingDate = '2026-12-01';

        it('throws BadGatewayException when normalization expands title beyond 200 characters (D-09)', () => {
          const title198 = `Reservar carrinha ${'x'.repeat(180)}`; // 18 + 180 = 198 chars -> expands to 202 chars
          expect(() =>
            validator.validateLlmSuggestions(
              [{ title: title198, description: null, dueDate: null }],
              movingDate,
              referenceDate,
            ),
          ).toThrow(BadGatewayException);
        });

        it('accepts title that has exactly 200 characters after normalization (D-09 boundary)', () => {
          // "Alugar carrinha " (16) -> "Alugar van de frete " (20) + 180 chars = 200 chars
          const rawTitle = `Alugar carrinha ${'y'.repeat(180)}`;
          const result = validator.validateLlmSuggestions(
            [{ title: rawTitle, description: null, dueDate: null }],
            movingDate,
            referenceDate,
          );
          expect(result).toHaveLength(1);
          expect(result[0].title.length).toBe(200);
        });

        it('throws BadGatewayException when title is 201 characters after normalization (D-09 +1 boundary)', () => {
          // "Alugar carrinha " (16) -> "Alugar van de frete " (20) + 181 chars = 201 chars
          const rawTitle = `Alugar carrinha ${'y'.repeat(181)}`;
          expect(() =>
            validator.validateLlmSuggestions(
              [{ title: rawTitle, description: null, dueDate: null }],
              movingDate,
              referenceDate,
            ),
          ).toThrow(BadGatewayException);
        });

        it('throws BadGatewayException when description exceeds 2000 characters after normalization (D-09 description boundary)', () => {
          const longDesc = `Alugar carrinha ${'z'.repeat(1984)}`; // expands beyond 2000 chars
          expect(() =>
            validator.validateLlmSuggestions(
              [
                {
                  title: 'Tarefa normal',
                  description: longDesc,
                  dueDate: null,
                },
              ],
              movingDate,
              referenceDate,
            ),
          ).toThrow(BadGatewayException);
        });
      });

      describe('P3.5-D — Reduzir falsos preservados no filtro', () => {
        it('discards multi-domain task when ALL detected domains are AUSENTE (B-18)', () => {
          const task = {
            title: 'Agendar consulta veterinária para os cães e podar o jardim',
            description:
              'Atualizar vacinas do pet e regar os vasos de plantas',
          };
          expect(
            isTaskCompatibleWithContext(
              task,
              'Mudança sem animais e sem plantas',
            ),
          ).toBe(false);
        });

        it('preserves multi-domain task when one domain is PRESENTE and another is AUSENTE (B-18 variant)', () => {
          const task = {
            title: 'Agendar consulta veterinária para os cães e podar o jardim',
            description:
              'Atualizar vacinas do pet e regar os vasos de plantas',
          };
          expect(
            isTaskCompatibleWithContext(
              task,
              'Mudança com dois cães e sem plantas',
            ),
          ).toBe(true);
        });

        it('preserves multi-domain task when one domain is DESCONHECIDO (B-18 variant)', () => {
          const task = {
            title: 'Agendar consulta veterinária para os cães e podar o jardim',
            description:
              'Atualizar vacinas do pet e regar os vasos de plantas',
          };
          expect(isTaskCompatibleWithContext(task, 'Mudança sem animais')).toBe(
            true,
          );
        });

        it('classifies enrollment task mentioning RG/CPF as STUDENT and discards in non-student plan (B-19)', () => {
          const task = {
            title: 'Confirmar matrícula na secretaria da universidade',
            description:
              'Levar RG, CPF e histórico escolar para validar a matrícula acadêmica',
          };
          expect(classifyTaskDomain(task)).toBe(TaskDomain.STUDENT);
          expect(isTaskCompatibleWithContext(task, 'Não sou estudante')).toBe(
            false,
          );
        });

        it('preserves personal document organization tasks mentioning RG/CPF without academic context (B-19 generic)', () => {
          const task = {
            title: 'Organizar pasta de documentos pessoais',
            description:
              'Conferir RG, CPF, certidões civis e comprovantes de residência',
          };
          expect(classifyTaskDomain(task)).toBe(TaskDomain.GENERIC);
          expect(isTaskCompatibleWithContext(task, 'Não sou estudante')).toBe(
            true,
          );
        });

        it('recognizes PETS and discards when intervening words appear between ração and pet (B-20)', () => {
          const task = {
            title: 'Comprar ração suficiente para a primeira semana dos cães',
            description: 'Garantir alimentação do pet na nova residência',
          };
          expect(classifyTaskDomain(task)).toBe(TaskDomain.PETS);
          expect(isTaskCompatibleWithContext(task, 'Mudança sem animais')).toBe(
            false,
          );
        });
      });

      describe('P3.5-E — Refinar a extração tri-state', () => {
        it('does not let date uncertainty in another clause contaminate PETS presence (A-08)', () => {
          expect(
            extractPetsContext('Mudança com data indefinida e com dois cães'),
          ).toBe(ContextState.PRESENTE);
        });

        it('recognizes restrictive exception after general absence as PRESENTE (A-09)', () => {
          expect(
            extractPetsContext('Mudança sem animais, apenas um cão pequeno'),
          ).toBe(ContextState.PRESENTE);
          expect(
            extractPetsContext('Mudança sem animais, exceto dois gatos'),
          ).toBe(ContextState.PRESENTE);
        });

        it('does not classify as presence when the restrictive exception itself is negated (A-09 guard)', () => {
          expect(
            extractPetsContext('Mudança sem animais, exceto nenhum animal'),
          ).not.toBe(ContextState.PRESENTE);
        });

        it('extracts PLANTS presence with numeric quantifier before mudas (A-17)', () => {
          expect(extractPlantsContext('Mudança com 5 mudas')).toBe(
            ContextState.PRESENTE,
          );
        });

        it('extracts PLANTS absence when article intervenes between sem and mudas (A-18)', () => {
          expect(extractPlantsContext('Mudança sem as mudas')).toBe(
            ContextState.AUSENTE,
          );
        });

        it('classifies geographic office reference with possessive pronoun as DESCONHECIDO (A-26)', () => {
          expect(
            extractHomeOfficeContext(
              'Mudança próxima ao meu escritório no centro',
            ),
          ).toBe(ContextState.DESCONHECIDO);
          expect(
            extractHomeOfficeContext('Mudança perto do nosso escritório'),
          ).toBe(ContextState.DESCONHECIDO);
        });

        it('preserves HOME_OFFICE presence when home office is explicitly stated with possessive (A-26 positive guard)', () => {
          expect(
            extractHomeOfficeContext('Mudança com meu escritório em casa'),
          ).toBe(ContextState.PRESENTE);
          expect(
            extractHomeOfficeContext('Mudança com meu home office montado'),
          ).toBe(ContextState.PRESENTE);
        });

        it('does not contaminate STUDENT presence when uncertainty is in an unrelated preceding clause (A-34)', () => {
          expect(
            extractStudentContext(
              'Mudança talvez no sábado para estudante universitário',
            ),
          ).toBe(ContextState.PRESENTE);
        });
      });
    });
  });
});
