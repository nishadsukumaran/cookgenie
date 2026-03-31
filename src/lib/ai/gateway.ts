/**
 * AI Gateway configuration for CookGenie.
 *
 * In v0 projects, the Vercel AI Gateway works automatically without explicit tokens.
 * We only fall back to mock mode if MOCK_AI environment variable is explicitly set.
 */

export const AI_CONFIG = {
  /** Maximum tokens for responses */
  maxTokens: 512,

  /** Model tiers — all use gateway format */
  models: {
    primary: "openai/gpt-4o-mini",
    validator: "openai/gpt-4o-mini",
    arbitrator: "openai/gpt-4o-mini",
    fast: "openai/gpt-4o-mini",
  },
} as const;

/**
 * Check if the AI Gateway is configured and available.
 * In v0 projects, the gateway is always available (zero-config).
 */
export function isGatewayAvailable(): boolean {
  // In v0/Vercel, gateway is always available
  // Only return false if explicitly mocked
  if (typeof process === "undefined") return true;
  return process.env.MOCK_AI !== "true";
}

/**
 * Whether to use mock responses.
 * Only mock if explicitly set via MOCK_AI=true.
 */
export function shouldUseMock(): boolean {
  if (typeof process === "undefined") return false;
  return process.env.MOCK_AI === "true";
}

/**
 * Get a model string by tier.
 */
export function getModel(tier: keyof typeof AI_CONFIG.models = "primary"): string {
  return AI_CONFIG.models[tier];
}
