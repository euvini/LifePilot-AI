export interface ExpectedDimension {
  id: string;
  label: string;
  keywords: string[];
}

export interface EvaluationScenario {
  id: number;
  name: string;
  description: string;
  plan: {
    planTitle: string;
    origin: string;
    destination: string;
    referenceDate: string;
    movingDate: string;
    maxSuggestions: number;
  };
  expectedKeywords: string[];
  expectedDimensions?: ExpectedDimension[];
  prohibitedContexts?: string[];
  dependencyRules: Array<{ pre: string[]; post: string[] }>;
}

export interface EvaluationItem {
  title: string;
  description: string | null;
  dueDate: string | null;
}

export interface ContextualRelevanceResult {
  score: number;
  coveragePct: number;
  matchedDimensions: string[];
  missingDimensions: string[];
}

export interface TaskSpecificityResult {
  score: number;
  genericTasks: string[];
  outOfContextTasks: string[];
  genericCount: number;
  outOfContextCount: number;
}

export interface SemanticDuplicationResult {
  score: number;
  duplicateCount: number;
  duplicatePairs: Array<{ taskA: string; taskB: string; reason: string }>;
}

export interface DependencyCoherenceResult {
  score: number;
  dependencyInversions: number;
  inversionDetails: Array<{
    preTask: string | null;
    preDate: string;
    postTask: string | null;
    postDate: string;
    violation: string;
  }>;
  arrayInversions: number;
}

export interface PtBrQualityResult {
  score: number;
  ptBrScorePct: number;
  anglicismsFound: string[];
  europeanTermsFound: string[];
  inappropriateFound: string[];
  recommendedTermsFound: string[];
  totalViolations: number;
}

export interface EvaluationResult {
  scenarioId: number;
  name: string;
  referenceDate: string;
  movingDate: string;
  taskCount: number;
  datedCount: number;
  beforeReferenceCount: number;
  afterMovingCount: number;
  invalidDateCount: number;
  inLast7Days: number;
  beforeLast7Days: number;
  pctInLast7Days: number;
  windows: {
    beyond30d: number;
    days15to30: number;
    days8to14: number;
    last7days: number;
  };
  dependencyInversions: number;
  arrayInversions: number;
  semanticDuplicates: number;
  legacyScore: number;
  legacyBreakdown: {
    schemaScore: number;
    orderScore: number;
    relevanceScore: number;
    diversityScore: number;
  };
  qualityScore: number;
  qualityBreakdown: {
    validity: number;
    temporalDistribution: number;
    contextualRelevance: number;
    taskSpecificity: number;
    dependencyCoherence: number;
    semanticDiversity: number;
    ptBrQuality: number;
  };
  metrics: {
    contextualRelevance: ContextualRelevanceResult;
    taskSpecificity: TaskSpecificityResult;
    semanticDuplication: SemanticDuplicationResult;
    dependencyCoherence: DependencyCoherenceResult;
    ptBrQuality: PtBrQualityResult;
  };
}

export function isValidCalendarDate(dateString: string): boolean;
export function parseDaysDiff(dateA: string, dateB: string): number;
export function sortSuggestionsChronologically<T extends { dueDate?: string | null }>(
  items: T[],
): T[];
export const MOVING_DAY_EXPRESSIONS: string[];
export function getSignificantTokens(text: string): string[];
export function computeSemanticSimilarity(textA: string, textB: string): number;
export function identifyCanonicalAction(text: string): string | null;
export function evaluateContextualRelevance(
  suggestions: EvaluationItem[],
  scenario: EvaluationScenario,
): ContextualRelevanceResult;
export function evaluateTaskSpecificity(
  suggestions: EvaluationItem[],
  scenario: EvaluationScenario,
): TaskSpecificityResult;
export function evaluateSemanticDuplication(
  suggestions: EvaluationItem[],
): SemanticDuplicationResult;
export function evaluateDependencyCoherence(
  suggestions: EvaluationItem[],
  scenario: EvaluationScenario,
): DependencyCoherenceResult;
export function evaluatePtBrQuality(
  suggestions: EvaluationItem[],
): PtBrQualityResult;
export function evaluateSuggestions(
  suggestions: EvaluationItem[],
  scenario: EvaluationScenario,
  referenceDate?: string,
): EvaluationResult;
export function calculateMedian(numbers: number[]): number;
export function calculateMean(numbers: number[]): number;
export function runEvaluation(): Promise<void>;
export const EVALUATION_SCENARIOS: EvaluationScenario[];
