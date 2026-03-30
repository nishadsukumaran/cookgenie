/**
 * AI Task: Substitution Analysis
 *
 * Provides contextual reasoning about ingredient substitutions
 * beyond what the deterministic engine covers.
 */

import type { AiTaskResponse } from "../../engines/types";

interface SubstitutionAnalysisInput {
  recipeName: string;
  originalIngredient: string;
  substituteIngredient: string;
  cuisine?: string;
  dietaryReason?: string;
}

export const SUBSTITUTION_ANALYSIS_PROMPT = `You are CookGenie, an expert chef specializing in ingredient substitutions.
When analyzing a substitution, consider:
1. How does this change the dish's flavor profile?
2. Does it affect cooking technique or timing?
3. How does it impact the dish's cultural authenticity?
4. What adjustments should the cook make to compensate?
Be honest about trade-offs. Don't pretend a substitute is identical when it's not.
Keep responses under 150 words.`;

export function mockSubstitutionAnalysis(input: SubstitutionAnalysisInput): AiTaskResponse {
  return {
    content: `Swapping ${input.originalIngredient} for ${input.substituteIngredient} in ${input.recipeName} is a reasonable change. ${
      input.dietaryReason
        ? `Since you're making this swap for ${input.dietaryReason}, `
        : ""
    }The key thing to watch is how it affects the overall balance of the dish. You may need to adjust seasoning slightly after the swap. Cook's tip: add the substitute at the same stage as the original and taste after 5 minutes to see if any adjustment is needed.`,
    cached: true,
    model: "mock",
  };
}
