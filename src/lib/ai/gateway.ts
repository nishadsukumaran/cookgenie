/**
 * AI Gateway configuration for CookGenie.
 *
 * Auto-detects mock vs live mode based on VERCEL_OIDC_TOKEN.
 * Uses "provider/model" strings routed through Vercel AI Gateway.
 */

export const AI_CONFIG = {
  /** Maximum tokens for responses */
  maxTokens: 512,

  /** Model tiers — all use gateway format */
  models: {
    primary: "anthropic/claude-sonnet-4.6",
    validator: "google/gemini-2.5-flash",
    arbitrator: "anthropic/claude-sonnet-4.6",
    fast: "anthropic/claude-haiku-4.5",
  },
} as const;

/**
 * Check if the AI Gateway is configured and available.
 */
export function isGatewayAvailable(): boolean {
  if (typeof process === "undefined") return false;
  return !!(
    process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY
  );
}

/**
 * Whether to use mock responses.
 * Live mode when OIDC token is present.
 */
export function shouldUseMock(): boolean {
  return !isGatewayAvailable();
}

/**
 * Get a model string by tier.
 */
export function getModel(tier: keyof typeof AI_CONFIG.models = "primary"): string {
  return AI_CONFIG.models[tier];
}
