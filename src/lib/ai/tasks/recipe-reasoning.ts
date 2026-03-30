/**
 * AI Task: Recipe Reasoning
 *
 * Answers "why" questions about recipes — why a step matters,
 * why an ingredient is important, what happens if you skip something.
 */

import type { AiTaskResponse } from "../../engines/types";

interface RecipeReasoningInput {
  recipeName: string;
  question: string;
  context?: {
    currentStep?: number;
    ingredients?: string[];
    cuisine?: string;
  };
}

/**
 * System prompt for recipe reasoning tasks.
 */
export const RECIPE_REASONING_PROMPT = `You are CookGenie, an expert chef and cooking scientist.
When a user asks about a recipe, explain the WHY behind cooking decisions.
Be concise, practical, and specific to the dish and cuisine.
Use simple language — the user is cooking, not reading a textbook.
Always give actionable advice, not just theory.`;

/**
 * Generate a mock response for recipe reasoning.
 * Used when AI Gateway is not available.
 */
export function mockRecipeReasoning(input: RecipeReasoningInput): AiTaskResponse {
  const responses: Record<string, string> = {
    default: `Great question about ${input.recipeName}! This is a key detail that affects the final dish. The technique matters because it builds layers of flavor — each step transforms the ingredients in a specific way that the next step depends on. If you skip or rush it, the end result won't have the same depth.`,
  };

  return {
    content: responses.default,
    cached: true,
    model: "mock",
  };
}
