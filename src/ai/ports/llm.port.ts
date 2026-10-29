export interface TaskSuggestionPromptInput {
  planTitle: string;
  origin: string;
  destination: string;
  movingDate: string; // YYYY-MM-DD
  maxSuggestions: number;
}

export interface RawLlmTaskSuggestion {
  title: string;
  description: string | null;
  dueDate: string | null;
}

export interface LlmPort {
  generateTaskSuggestions(
    input: TaskSuggestionPromptInput,
  ): Promise<RawLlmTaskSuggestion[]>;
}

export const LLM_PORT = Symbol('LLM_PORT');
