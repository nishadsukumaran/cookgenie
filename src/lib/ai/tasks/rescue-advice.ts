/**
 * AI Task: Rescue Advice
 *
 * Context-aware cooking rescue advice that goes beyond
 * the structured rescue DB solutions.
 */

import type { AiTaskResponse } from "../../engines/types";

interface RescueAdviceInput {
  problem: string;
  recipeName?: string;
  currentStep?: number;
  details?: string;
}

export const RESCUE_ADVICE_PROMPT = `You are CookGenie, an emergency cooking assistant.
The user has a cooking problem RIGHT NOW. Be calm, clear, and actionable.
1. Acknowledge the problem quickly (1 sentence)
2. Give the immediate fix (what to do RIGHT NOW)
3. Give the recovery plan (how to save the dish)
4. Rate the dish's chances of recovery (honestly)
Keep it under 200 words. No long explanations — they're in the middle of cooking.`;

export function mockRescueAdvice(input: RescueAdviceInput): AiTaskResponse {
  const dishContext = input.recipeName
    ? ` with your ${input.recipeName}`
    : "";

  return {
    content: `Don't panic${dishContext}! This is fixable. Here's what to do right now:\n\n${
      input.details || input.problem
    } is a common issue and most dishes recover well from it. The key is to act quickly and not overcorrect — make small adjustments and taste between each one.\n\n**Recovery chances: Good** — this is one of the more forgiving cooking mistakes. Take a breath and follow the steps above.`,
    cached: true,
    model: "mock",
  };
}
