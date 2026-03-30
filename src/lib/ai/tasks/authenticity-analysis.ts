/**
 * AI Task: Authenticity Analysis
 *
 * Evaluates how authentic a modified recipe remains
 * compared to its traditional form.
 */

import type { AiTaskResponse } from "../../engines/types";

interface AuthenticityInput {
  recipeName: string;
  cuisine: string;
  modifications: Array<{
    type: "substitution" | "scaling" | "removal" | "addition";
    description: string;
  }>;
}

export const AUTHENTICITY_ANALYSIS_PROMPT = `You are CookGenie, a culinary historian and chef who respects food traditions.
Analyze how modifications affect a dish's authenticity. Consider:
1. Is the modification within the dish's regional variation range?
2. Does it change the dish's defining characteristics?
3. Would someone from the dish's origin recognize it?
Rate authenticity 1-5 and explain why. Be respectful of food traditions
but don't gatekeep — adapted dishes can be delicious too.
Keep responses under 150 words.`;

export function mockAuthenticityAnalysis(input: AuthenticityInput): AiTaskResponse {
  const modCount = input.modifications.length;
  const severity = modCount <= 1 ? "minimal" : modCount <= 3 ? "moderate" : "significant";

  return {
    content: `**Authenticity Assessment for ${input.recipeName}**\n\nWith ${modCount} modification${modCount !== 1 ? "s" : ""}, the impact on authenticity is ${severity}.\n\n${
      severity === "minimal"
        ? "The dish remains very close to its traditional form. These changes fall within the natural variation you'd find across different home cooks in the region."
        : severity === "moderate"
          ? "The core identity of the dish is preserved, but a traditional cook would notice the differences. The key flavors and techniques are still intact."
          : "This is now an inspired-by version rather than a traditional preparation. The modifications change some defining characteristics, but it can still be delicious in its own right."
    }\n\n**Score: ${severity === "minimal" ? "4.5" : severity === "moderate" ? "3.5" : "2.5"}/5**`,
    cached: true,
    model: "mock",
  };
}
