export interface TaskSuggestionItemResponse {
  title: string;
  description: string | null;
  dueDate: string | null;
}

export interface TaskSuggestionsResponse {
  movingPlanId: string;
  generatedAt: string;
  suggestions: TaskSuggestionItemResponse[];
}
