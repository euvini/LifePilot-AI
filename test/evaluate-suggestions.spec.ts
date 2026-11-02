import { describe, expect, it } from 'vitest';
import {
  evaluateContextualRelevance,
  evaluateDependencyCoherence,
  evaluatePtBrQuality,
  evaluateSemanticDuplication,
  evaluateSuggestions,
  evaluateTaskSpecificity,
  EVALUATION_SCENARIOS,
  identifyCanonicalAction,
  isValidCalendarDate,
  MOVING_DAY_EXPRESSIONS,
  parseDaysDiff,
  sortSuggestionsChronologically,
} from '../scripts/evaluate-suggestions.mjs';

describe('evaluate-suggestions (Multidimensional Quality Evaluator)', () => {
  const urgentScenario = EVALUATION_SCENARIOS[0]; // Scenario 1: Urgent T1 (10d)
  const petScenario = EVALUATION_SCENARIOS[2]; // Scenario 3: Pets & Garden (40d)
  const officeScenario = EVALUATION_SCENARIOS[4]; // Scenario 5: Home Office / TI (76d)
  const referenceDate = '2026-10-31';

  describe('1. Relevância Contextual (evaluateContextualRelevance)', () => {
    it('awards high score when tasks cover the specific dimensions of the scenario', () => {
      const suggestions = [
        {
          title: 'Agendar consulta com veterinário e atualizar vacinas dos cães',
          description: 'Garantir que a carteira de vacinação dos cães esteja em dia',
          dueDate: '2026-11-05',
        },
        {
          title: 'Comprar caixa de transporte e ração para os animais',
          description: 'Adaptação dos cães para a viagem até Braga',
          dueDate: '2026-11-10',
        },
        {
          title: 'Separar mudas e preparar vasos de plantas do jardim',
          description: 'Acondicionar as plantas para transporte sem danos',
          dueDate: '2026-11-15',
        },
        {
          title: 'Contratar caminhão de mudança com motorista',
          description: 'Transportar móveis e pertences de Coimbra para Braga',
          dueDate: '2026-11-20',
        },
        {
          title: 'Providenciar caixas de papelão e embalar os pertences',
          description: 'Embalar os itens da casa com fita adesiva',
          dueDate: '2026-11-25',
        },
      ];

      const res = evaluateContextualRelevance(suggestions, petScenario);
      expect(res.coveragePct).toBe(100);
      expect(res.score).toBe(15);
      expect(res.missingDimensions).toHaveLength(0);
      expect(res.matchedDimensions).toContain('Consulta veterinária e vacinas dos cães');
      expect(res.matchedDimensions).toContain('Transporte e cuidados com plantas/jardim');
    });

    it('penalizes when specific dimensions of the scenario are missing', () => {
      const genericSuggestions = [
        {
          title: 'Contratar caminhão de mudança',
          description: 'Transporte geral',
          dueDate: '2026-11-10',
        },
        {
          title: 'Providenciar caixas de papelão',
          description: 'Embalar coisas',
          dueDate: '2026-11-15',
        },
      ];

      const res = evaluateContextualRelevance(genericSuggestions, petScenario);
      expect(res.coveragePct).toBeLessThan(60);
      expect(res.score).toBeLessThan(10);
      expect(res.missingDimensions).toContain('Consulta veterinária e vacinas dos cães');
      expect(res.missingDimensions).toContain('Transporte e cuidados com plantas/jardim');
    });

    it('handles edge case of empty suggestions gracefully', () => {
      const res = evaluateContextualRelevance([], petScenario);
      expect(res.coveragePct).toBe(0);
      expect(res.score).toBe(0);
      expect(res.matchedDimensions).toHaveLength(0);
    });
  });

  describe('2. Especificidade das Tarefas (evaluateTaskSpecificity)', () => {
    it('awards full score for concrete and scenario-appropriate tasks', () => {
      const suggestions = [
        {
          title: 'Embalar computadores e monitores com plástico-bolha',
          description: 'Proteger equipamentos sensíveis da estação de trabalho',
          dueDate: '2027-01-05',
        },
        {
          title: 'Fazer backup digital de arquivos de trabalho na nuvem',
          description: 'Garantir cópia de segurança antes do desligamento',
          dueDate: '2027-01-03',
        },
      ];

      const res = evaluateTaskSpecificity(suggestions, officeScenario);
      expect(res.score).toBe(10);
      expect(res.genericCount).toBe(0);
      expect(res.outOfContextCount).toBe(0);
    });

    it('penalizes vague and generic task titles', () => {
      const suggestions = [
        { title: 'Preparar para a mudança', description: null, dueDate: '2026-11-05' },
        { title: 'Finalizar preparação', description: null, dueDate: '2026-11-08' },
        { title: 'Organizar os pertences', description: null, dueDate: '2026-11-03' },
      ];

      const res = evaluateTaskSpecificity(suggestions, urgentScenario);
      expect(res.genericCount).toBe(3);
      expect(res.score).toBeLessThanOrEqual(4);
      expect(res.genericTasks).toContain('Preparar para a mudança');
    });

    it('penalizes out-of-context tasks (e.g., IT backup in pet/garden scenario)', () => {
      const suggestions = [
        {
          title: 'Fazer backup de arquivos de escritório e servidores',
          description: 'Cópia de segurança digital',
          dueDate: '2026-11-05',
        },
      ];

      const res = evaluateTaskSpecificity(suggestions, petScenario);
      expect(res.outOfContextCount).toBe(1);
      expect(res.score).toBeLessThan(10);
      expect(res.outOfContextTasks[0]).toContain('contexto inadequado: "backup"');
    });
  });

  describe('3. Duplicações Semânticas (evaluateSemanticDuplication)', () => {
    it('identifies canonical action duplicates (paraphrases representing the same action)', () => {
      const suggestions = [
        {
          title: 'Contratar caminhão de mudança',
          description: 'Cotar frete com transportadora para o transporte dos móveis',
          dueDate: '2026-11-02',
        },
        {
          title: 'Reservar veículo de transporte para a mudança',
          description: 'Agendar frete para levar as coisas',
          dueDate: '2026-11-03',
        },
      ];

      const res = evaluateSemanticDuplication(suggestions);
      expect(res.duplicateCount).toBe(1);
      expect(res.score).toBeLessThan(10);
      expect(res.duplicatePairs[0].reason).toContain('LOGISTICA_TRANSPORTE');
    });

    it('identifies high token overlap duplicates (paraphrases / repetitions)', () => {
      const suggestions = [
        {
          title: 'Embalar itens essenciais para os primeiros dias',
          description: 'Mala com roupas e remédios',
          dueDate: '2026-11-08',
        },
        {
          title: 'Embalar itens essenciais para os primeiros dias (segunda parte)',
          description: 'Mala com roupas e itens de higiene',
          dueDate: '2026-11-09',
        },
      ];

      const res = evaluateSemanticDuplication(suggestions);
      expect(res.duplicateCount).toBeGreaterThanOrEqual(1);
    });

    it('does NOT flag false positives for distinct actions in different rooms/scopes', () => {
      const suggestions = [
        {
          title: 'Comprar caixas de papelão e fita adesiva',
          description: 'Providenciar insumos de embalagem',
          dueDate: '2026-11-02',
        },
        {
          title: 'Embalar pertences de menor uso e livros',
          description: 'Guardar itens das estantes em caixas',
          dueDate: '2026-11-05',
        },
        {
          title: 'Preparar mala com itens essenciais para os primeiros dias',
          description: 'Roupas, documentos e remédios para a primeira noite',
          dueDate: '2026-11-09',
        },
      ];

      const res = evaluateSemanticDuplication(suggestions);
      expect(res.duplicateCount).toBe(0);
      expect(res.score).toBe(10);
    });

    it('identifies exact duplicate titles', () => {
      const suggestions = [
        { title: 'Contratar frete', description: null, dueDate: '2026-11-02' },
        { title: 'Contratar frete', description: null, dueDate: '2026-11-03' },
      ];

      const res = evaluateSemanticDuplication(suggestions);
      expect(res.duplicateCount).toBeGreaterThanOrEqual(1);
      expect(res.duplicatePairs.some((p) => p.reason === 'Títulos idênticos')).toBe(true);
    });

    it('identifies canonical action correctly via identifyCanonicalAction', () => {
      expect(identifyCanonicalAction('contratar caminhão de mudança')).toBe('LOGISTICA_TRANSPORTE');
      expect(identifyCanonicalAction('desapegar de itens para doação')).toBe('TRIAGEM_DESAPEGO');
      expect(identifyCanonicalAction('fazer backup digital de arquivos')).toBe('BACKUP_DIGITAL');
      expect(identifyCanonicalAction('consulta no veterinário com vacinas do pet')).toBe('VETERINARIO_PETS');
      expect(identifyCanonicalAction('vistoria final e devolução das chaves')).toBe('VISTORIA_CHAVES');
      expect(identifyCanonicalAction('cozinhar o almoço')).toBeNull();
    });
  });

  describe('4. Coerência de Dependências (evaluateDependencyCoherence)', () => {
    it('awards high score when causal prerequisites are respected in dates', () => {
      const suggestions = [
        {
          title: 'Fazer triagem e separar itens para doação',
          description: 'Desapegar antes de começar a empacotar',
          dueDate: '2026-11-02', // Earliest
        },
        {
          title: 'Providenciar caixas de papelão e embalar pertences',
          description: 'Embalar os pertences que serão levados',
          dueDate: '2026-11-05', // After triage
        },
      ];

      const res = evaluateDependencyCoherence(suggestions, urgentScenario);
      expect(res.dependencyInversions).toBe(0);
      expect(res.inversionDetails).toHaveLength(0);
      expect(res.score).toBe(10);
    });

    it('detects and details causal dependency violations when preTask is scheduled after postTask', () => {
      const suggestions = [
        {
          title: 'Embalar pertences em caixas de papelão',
          description: 'Embalar tudo',
          dueDate: '2026-11-02', // Occurs BEFORE triage!
        },
        {
          title: 'Fazer triagem e separar itens para doação',
          description: 'Triagem tardia',
          dueDate: '2026-11-08', // Occurs AFTER packing!
        },
      ];

      const res = evaluateDependencyCoherence(suggestions, urgentScenario);
      expect(res.dependencyInversions).toBeGreaterThanOrEqual(1);
      expect(res.score).toBeLessThan(10);
      expect(res.inversionDetails[0].violation).toContain('deveria anteceder');
    });

    it('penalizes array chronological inversions when elements are not sorted ascending', () => {
      const suggestions = [
        { title: 'Tarefa 1', description: null, dueDate: '2026-11-08' },
        { title: 'Tarefa 2', description: null, dueDate: '2026-11-02' }, // Inverted in array!
      ];

      const res = evaluateDependencyCoherence(suggestions, urgentScenario);
      expect(res.arrayInversions).toBe(1);
      expect(res.score).toBeLessThan(10);
    });

    it('6. Contratação de caminhão sem falso positivo (Cenário 2)', () => {
      const longDistanceScenario = EVALUATION_SCENARIOS[1]; // Scenario 2
      const suggestions = [
        {
          title: 'Contratar caminhão de mudança',
          description: 'Agendar transporte com a transportadora para a mudança',
          dueDate: '2026-11-15',
        },
        {
          title: 'Agendar transferência de contas',
          description: 'Transferir contas de água, luz e internet para o novo endereço',
          dueDate: '2026-12-10',
        },
      ];

      const res = evaluateDependencyCoherence(suggestions, longDistanceScenario);
      // Hiring moving truck early must NOT be confused with moving day execution
      expect(res.dependencyInversions).toBe(0);
      expect(res.inversionDetails).toHaveLength(0);
      expect(res.score).toBe(10);
    });

    it('7. Agendamento de transportadora sem falso positivo', () => {
      const longDistanceScenario = EVALUATION_SCENARIOS[1];
      const suggestions = [
        {
          title: 'Agendar transporte com a transportadora',
          description: 'Reservar veículo adequado para viagem interestadual',
          dueDate: '2026-11-10',
        },
        {
          title: 'Transferir contas de água, luz e energia',
          description: 'Solicitar corte e ligação no novo endereço',
          dueDate: '2026-12-05',
        },
      ];

      const res = evaluateDependencyCoherence(suggestions, longDistanceScenario);
      expect(res.dependencyInversions).toBe(0);
      expect(res.inversionDetails).toHaveLength(0);
      expect(res.score).toBe(10);
    });

    it('8. Dia da mudança corretamente identificado como evento final', () => {
      expect(MOVING_DAY_EXPRESSIONS).toContain('dia da mudança');
      const longDistanceScenario = EVALUATION_SCENARIOS[1];
      const suggestions = [
        {
          title: 'Transferir contas de água, luz e energia',
          description: 'Solicitar transferência das contas',
          dueDate: '2026-12-10',
        },
        {
          title: 'Transporte final dos pertences no dia da mudança',
          description: 'Acompanhar descarregamento no novo imóvel',
          dueDate: '2026-12-30',
        },
      ];

      const res = evaluateDependencyCoherence(suggestions, longDistanceScenario);
      expect(res.dependencyInversions).toBe(0);
      expect(res.inversionDetails).toHaveLength(0);
      expect(res.score).toBe(10);
    });

    it('9. Execução da mudança corretamente identificada como evento final', () => {
      const longDistanceScenario = EVALUATION_SCENARIOS[1];
      const suggestions = [
        {
          title: 'Desligar energia e transferir água e internet',
          description: 'Encerrar serviços no imóvel antigo',
          dueDate: '2026-12-15',
        },
        {
          title: 'Execução da mudança residencial e entrega das chaves',
          description: 'Concluir a transferência para a nova residência',
          dueDate: '2026-12-30',
        },
      ];

      const res = evaluateDependencyCoherence(suggestions, longDistanceScenario);
      expect(res.dependencyInversions).toBe(0);
      expect(res.inversionDetails).toHaveLength(0);
      expect(res.score).toBe(10);
    });

    it('10. Preservação das dependências causais legítimas quando violadas', () => {
      const longDistanceScenario = EVALUATION_SCENARIOS[1];
      // Legitimate violation: utility transfer is scheduled AFTER moving day execution!
      const suggestions = [
        {
          title: 'Execução da mudança residencial',
          description: 'Dia de carregar o caminhão e ir para a nova casa',
          dueDate: '2026-12-10',
        },
        {
          title: 'Transferir contas de água, luz e internet',
          description: 'Transferência tardia após a mudança já ter ocorrido',
          dueDate: '2026-12-28',
        },
      ];

      const res = evaluateDependencyCoherence(suggestions, longDistanceScenario);
      expect(res.dependencyInversions).toBeGreaterThanOrEqual(1);
      expect(res.inversionDetails[0].violation).toContain('deveria anteceder');
      expect(res.score).toBeLessThan(10);
    });
  });

  describe('P1. Ordenação Determinística (sortSuggestionsChronologically)', () => {
    it('1. ordena sugestões em ordem cronológica crescente', () => {
      const items = [
        { title: 'T3', description: null, dueDate: '2026-12-01' },
        { title: 'T1', description: null, dueDate: '2026-11-01' },
        { title: 'T2', description: null, dueDate: '2026-11-15' },
      ];

      const sorted = sortSuggestionsChronologically(items);
      expect(sorted.map((i) => i.dueDate)).toEqual([
        '2026-11-01',
        '2026-11-15',
        '2026-12-01',
      ]);
    });

    it('2. preserva a ordem original quando duas tarefas têm a mesma data (estabilidade)', () => {
      const items = [
        { title: 'Primeira com 2026-11-10', dueDate: '2026-11-10' },
        { title: 'Segunda com 2026-11-10', dueDate: '2026-11-10' },
        { title: 'Terceira com 2026-11-10', dueDate: '2026-11-10' },
      ];

      const sorted = sortSuggestionsChronologically(items);
      expect(sorted.map((i) => i.title)).toEqual([
        'Primeira com 2026-11-10',
        'Segunda com 2026-11-10',
        'Terceira com 2026-11-10',
      ]);
    });

    it('3. coloca datas nulas ou indefinidas no final', () => {
      const items = [
        { title: 'Nulo 1', dueDate: null },
        { title: 'Datado 1', dueDate: '2026-11-10' },
        { title: 'Indefinido 2', dueDate: undefined },
        { title: 'Datado 2', dueDate: '2026-11-02' },
      ];

      const sorted = sortSuggestionsChronologically(
        items as Array<{ title: string; dueDate?: string | null }>,
      );
      expect(sorted.map((i) => i.title)).toEqual([
        'Datado 2',
        'Datado 1',
        'Nulo 1',
        'Indefinido 2',
      ]);
    });

    it('4. não altera, acrescenta ou remove sugestões nem modifica as datas', () => {
      const items = [
        { title: 'Tarefa B', description: 'Desc B', dueDate: '2026-11-20' },
        { title: 'Tarefa A', description: 'Desc A', dueDate: '2026-11-05' },
      ];

      const sorted = sortSuggestionsChronologically(items);
      expect(sorted).toHaveLength(2);
      expect(sorted[0]).toEqual({
        title: 'Tarefa A',
        description: 'Desc A',
        dueDate: '2026-11-05',
      });
      expect(sorted[1]).toEqual({
        title: 'Tarefa B',
        description: 'Desc B',
        dueDate: '2026-11-20',
      });
      // Imutabilidade da array original
      expect(items[0].title).toBe('Tarefa B');
    });
  });

  describe('5. Qualidade Linguística PT-BR (evaluatePtBrQuality)', () => {
    it('awards 100% and top score for natural Brazilian Portuguese with recommended terms', () => {
      const suggestions = [
        {
          title: 'Contratar caminhão de mudança',
          description: 'Cotar frete com transportadora e avisar o condomínio',
          dueDate: '2026-11-02',
        },
        {
          title: 'Separar itens para doação e desapegar do que não será levado',
          description: 'Providenciar caixas de papelão e fita adesiva para embalar',
          dueDate: '2026-11-05',
        },
      ];

      const res = evaluatePtBrQuality(suggestions);
      expect(res.totalViolations).toBe(0);
      expect(res.ptBrScorePct).toBe(100);
      expect(res.score).toBe(5);
      expect(res.recommendedTermsFound).toContain('caminhão de mudança');
      expect(res.recommendedTermsFound).toContain('frete');
      expect(res.recommendedTermsFound).toContain('caixas de papelão');
    });

    it('penalizes artificial anglicisms (declutar, packing, pacotar)', () => {
      const suggestions = [
        { title: 'Declutar e organizar o armário', description: 'Packing de pertences', dueDate: '2026-11-02' },
        { title: 'Pacote de itens essenciais', description: null, dueDate: '2026-11-05' },
      ];

      const res = evaluatePtBrQuality(suggestions);
      expect(res.anglicismsFound.length).toBeGreaterThanOrEqual(2);
      expect(res.ptBrScorePct).toBeLessThan(60);
      expect(res.score).toBeLessThan(3);
    });

    it('penalizes European Portuguese terms (carrinha, autocarro, morada)', () => {
      const suggestions = [
        { title: 'Reservar carrinha para o transporte', description: 'Atualizar morada', dueDate: '2026-11-02' },
      ];

      const res = evaluatePtBrQuality(suggestions);
      expect(res.europeanTermsFound.length).toBeGreaterThanOrEqual(1);
      expect(res.ptBrScorePct).toBeLessThan(80);
      expect(res.score).toBeLessThan(5);
    });

    it('penalizes inappropriate moving terms (ônibus de mudança)', () => {
      const suggestions = [
        { title: 'Contratar ônibus de mudança', description: 'Levar as coisas', dueDate: '2026-11-02' },
      ];

      const res = evaluatePtBrQuality(suggestions);
      expect(res.inappropriateFound.length).toBe(1);
    });
  });

  describe('6. Avaliação Geral Integrada (evaluateSuggestions)', () => {
    it('integrates all dimensions and aggregates qualityScore out of 100 pts without mixing with temporal validity', () => {
      const suggestions = [
        {
          title: 'Contratar caminhão de mudança',
          description: 'Cotar frete com transportadora para o transporte de móveis',
          dueDate: '2026-10-31', // referenceDate
        },
        {
          title: 'Separar itens para doação e desapegar de pertences',
          description: 'Triagem de roupas e objetos',
          dueDate: '2026-11-03',
        },
        {
          title: 'Providenciar caixas de papelão e embalar pertences',
          description: 'Embalar com fita adesiva',
          dueDate: '2026-11-06',
        },
        {
          title: 'Transferir contas de água, luz e internet',
          description: 'Atualizar titularidade no novo endereço',
          dueDate: '2026-11-08',
        },
        {
          title: 'Preparar mala com itens essenciais para os primeiros dias',
          description: 'Roupas, medicamentos e itens de higiene pessoal',
          dueDate: '2026-11-10', // movingDate
        },
      ];

      const result = evaluateSuggestions(suggestions, urgentScenario, referenceDate);

      // Temporal checks
      expect(result.beforeReferenceCount).toBe(0);
      expect(result.afterMovingCount).toBe(0);
      expect(result.datedCount).toBe(5);
      expect(result.qualityBreakdown.validity).toBe(20);

      // Specialized metrics
      expect(result.metrics.contextualRelevance.coveragePct).toBe(100);
      expect(result.metrics.taskSpecificity.genericCount).toBe(0);
      expect(result.metrics.semanticDuplication.duplicateCount).toBe(0);
      expect(result.metrics.dependencyCoherence.dependencyInversions).toBe(0);
      expect(result.metrics.ptBrQuality.ptBrScorePct).toBe(100);

      // Total aggregated score is sum of components
      const expectedTotal =
        result.qualityBreakdown.validity +
        result.qualityBreakdown.temporalDistribution +
        result.qualityBreakdown.contextualRelevance +
        result.qualityBreakdown.taskSpecificity +
        result.qualityBreakdown.dependencyCoherence +
        result.qualityBreakdown.semanticDiversity +
        result.qualityBreakdown.ptBrQuality;

      expect(result.qualityScore).toBeCloseTo(expectedTotal, 1);
      expect(result.qualityScore).toBeGreaterThanOrEqual(90);
    });

    it('correctly catches expired dates without affecting semantic calculation', () => {
      const suggestions = [
        {
          title: 'Contratar caminhão de mudança',
          description: 'Frete',
          dueDate: '2026-10-25', // BEFORE referenceDate 2026-10-31
        },
      ];

      const result = evaluateSuggestions(suggestions, urgentScenario, referenceDate);
      expect(result.beforeReferenceCount).toBe(1);
      expect(result.qualityBreakdown.validity).toBeLessThan(20);
    });
  });

  describe('7. Utilitários Básicos', () => {
    it('validates calendar dates accurately', () => {
      expect(isValidCalendarDate('2026-02-28')).toBe(true);
      expect(isValidCalendarDate('2026-02-31')).toBe(false);
      expect(isValidCalendarDate('not-a-date')).toBe(false);
    });

    it('calculates days difference accurately', () => {
      expect(parseDaysDiff('2026-10-31', '2026-11-10')).toBe(10);
    });
  });
});
