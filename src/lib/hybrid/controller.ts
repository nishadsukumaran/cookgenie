/**
 * Hybrid Intelligence Controller
 *
 * Combines deterministic knowledge (engines) with AI reasoning
 * and multi-model arbitration into unified HybridResponse objects.
 *
 * Flow:
 * 1. Detect intent (deterministic)
 * 2. Fetch structured knowledge (deterministic)
 * 3. Run AI through arbitration pipeline (selective multi-model)
 * 4. Apply knowledge guardrail (deterministic)
 * 5. Merge into HybridResponse
 */

import type { HybridResponse, DetectedIntent } from "./types";
import { detectIntent, intentToRescueProblem } from "./intent";
import { getRescue } from "../engines/rescue";
import { findSubstitutesFor } from "../engines/substitution";
import { ai } from "../ai";
import { arbitrate } from "../ai/arbitration";
import type { StructuredAdvice } from "../ai/arbitration/types";

// ─── Public API ─────────────────────────────────────

/**
 * Process any user input through the hybrid intelligence pipeline.
 */
export async function processQuery(
  input: string,
  context?: { recipeName?: string; cuisine?: string; currentStep?: number }
): Promise<HybridResponse> {
  const intent = detectIntent(input);

  switch (intent.category) {
    case "rescue":
      return handleRescue(intent, input, context);
    case "substitution":
      return handleSubstitution(intent, input, context);
    default:
      return handleGeneral(input, context);
  }
}

export { detectIntent } from "./intent";

// ─── Rescue Flow (with arbitration) ─────────────────

async function handleRescue(
  intent: DetectedIntent,
  input: string,
  context?: { recipeName?: string; cuisine?: string; currentStep?: number }
): Promise<HybridResponse> {
  const problem = intentToRescueProblem(intent);
  const rescue = problem ? getRescue(problem) : null;
  const hasStructuredKnowledge = rescue?.found ?? false;

  // Run through multi-model arbitration pipeline
  const arbitrationResult = await arbitrate({
    userInput: input,
    rescueProblem: problem ?? undefined,
    recipeName: context?.recipeName,
    cuisine: context?.cuisine,
    currentStep: context?.currentStep,
    hasStructuredKnowledge,
  });

  const advised = arbitrationResult.final;

  // Merge structured knowledge with arbitrated AI response
  if (rescue?.found && rescue.solution) {
    const sol = rescue.solution;

    // Use structured knowledge for the fix, AI for alternatives/explanation
    return {
      type: "rescue",
      fix: {
        title: `Fix: ${sol.label}`,
        instruction: sol.immediateFix.instruction,
        ingredients: sol.immediateFix.ingredients,
        urgency: rescue.urgency === "high" ? "immediate" : "when-ready",
        duration: sol.immediateFix.duration,
      },
      alternatives: [
        // Structured gradual fix
        {
          title: "Gradual Recovery",
          instruction: sol.gradualFix.instruction,
          ingredients: sol.gradualFix.ingredients,
          tradeoff: sol.gradualFix.duration
            ? `Takes ${sol.gradualFix.duration}`
            : "Takes longer but more thorough",
        },
        // AI-provided alternatives
        ...advised.alternatives.map((alt) => ({
          title: alt.action.slice(0, 50),
          instruction: alt.action,
          tradeoff: alt.tradeoff,
        })),
      ],
      impact: {
        taste: {
          direction: mapDirection(advised.impact_on_taste.direction),
          description: advised.impact_on_taste.note,
        },
        texture: {
          direction: mapDirection(advised.impact_on_texture.direction),
          description: advised.impact_on_texture.note,
        },
        authenticity: {
          direction: mapDirection(advised.authenticity_impact.direction),
          description: advised.authenticity_impact.note,
        },
      },
      explanation: advised.notes,
      proTip: sol.preventionTip,
      source: {
        structured: true,
        ai: true,
        confidence: advised.confidence >= 0.75 ? "high" : advised.confidence >= 0.5 ? "medium" : "low",
      },
      arbitration: {
        tiersUsed: arbitrationResult.tiersUsed,
        validationTriggered: arbitrationResult.validationTriggered,
        validationReasons: arbitrationResult.validationReasons,
        arbitrationTriggered: arbitrationResult.arbitrationTriggered,
        arbitrationReason: arbitrationResult.arbitrationReason,
        guardrailApplied: arbitrationResult.guardrailApplied,
        guardrailCorrections: arbitrationResult.guardrailCorrections,
      },
    };
  }

  // No structured knowledge — rely on arbitrated AI
  return structuredAdviceToHybrid(advised, arbitrationResult);
}

// ─── Substitution Flow ──────────────────────────────

async function handleSubstitution(
  intent: DetectedIntent,
  input: string,
  context?: { recipeName?: string; cuisine?: string }
): Promise<HybridResponse> {
  const originalIngredient = intent.entities.ingredient || intent.entities.original || "";
  const result = findSubstitutesFor(originalIngredient);

  const aiResponse = await ai.substitutionAnalysis({
    recipeName: context?.recipeName || "the dish",
    original: originalIngredient,
    substitute: result.best?.name || "alternative",
    cuisine: context?.cuisine,
  });

  if (result.found && result.best) {
    const best = result.best;
    const alternatives = result.all
      .filter((s) => s.name !== best.name)
      .map((s) => ({
        title: s.name,
        instruction: s.quantityInstruction,
        tradeoff: `${s.scoreLabel} (${s.score}% match) — ${s.impact.summary}`,
      }));

    return {
      type: "substitution",
      fix: {
        title: `Best Substitute: ${best.name}`,
        instruction: best.quantityInstruction,
        urgency: "when-ready",
      },
      alternatives,
      impact: {
        taste: {
          direction: best.impact.taste.score >= 4 ? "neutral" : "different",
          description: best.impact.taste.description,
        },
        texture: {
          direction: best.impact.texture.score >= 4 ? "neutral" : "different",
          description: best.impact.texture.description,
        },
        authenticity: {
          direction: best.impact.authenticity.score >= 4 ? "neutral" : best.impact.authenticity.score >= 3 ? "different" : "worse",
          description: best.impact.authenticity.description,
        },
      },
      explanation: aiResponse.content,
      proTip: `${best.name} scores ${best.score}% overall compatibility as a replacement for ${result.original}.`,
      source: {
        structured: true,
        ai: !aiResponse.wasMock,
        confidence: "high",
      },
    };
  }

  return {
    type: "substitution",
    fix: {
      title: "CookGenie's Suggestion",
      instruction: aiResponse.content,
      urgency: "when-ready",
    },
    alternatives: [],
    impact: {
      taste: { direction: "neutral", description: "Ask CookGenie for specifics" },
      texture: { direction: "neutral", description: "Ask CookGenie for specifics" },
      authenticity: { direction: "neutral", description: "Ask CookGenie for specifics" },
    },
    explanation: aiResponse.content,
    proTip: "When substituting, always add the replacement at the same cooking stage as the original.",
    source: { structured: false, ai: true, confidence: "low" },
  };
}

// ─── General Flow ───────────────────────────────────

async function handleGeneral(
  input: string,
  context?: { recipeName?: string; cuisine?: string }
): Promise<HybridResponse> {
  const aiResponse = await ai.recipeReasoning({
    recipeName: context?.recipeName || "your dish",
    question: input,
    cuisine: context?.cuisine,
  });

  return {
    type: "general",
    fix: {
      title: "CookGenie Says",
      instruction: aiResponse.content,
      urgency: "optional",
    },
    alternatives: [],
    impact: {
      taste: { direction: "neutral", description: "" },
      texture: { direction: "neutral", description: "" },
      authenticity: { direction: "neutral", description: "" },
    },
    explanation: aiResponse.content,
    proTip: "",
    source: { structured: false, ai: true, confidence: "medium" },
  };
}

// ─── Helpers ────────────────────────────────────────

function mapDirection(dir: string): "better" | "worse" | "neutral" | "different" {
  if (dir === "better" || dir === "worse" || dir === "neutral" || dir === "different") {
    return dir;
  }
  return "neutral";
}

function structuredAdviceToHybrid(
  advice: StructuredAdvice,
  arb: import("../ai/arbitration/types").ArbitrationResult
): HybridResponse {
  return {
    type: advice.scenario_type === "rescue" ? "rescue" : "general",
    fix: {
      title: "CookGenie's Advice",
      instruction: advice.primary_fix.action,
      ingredients: advice.primary_fix.ingredients,
      urgency: advice.primary_fix.urgency === "immediate"
        ? "immediate"
        : advice.primary_fix.urgency === "soon"
          ? "when-ready"
          : "optional",
    },
    alternatives: advice.alternatives.map((a) => ({
      title: a.action.slice(0, 50),
      instruction: a.action,
      tradeoff: a.tradeoff,
    })),
    impact: {
      taste: { direction: mapDirection(advice.impact_on_taste.direction), description: advice.impact_on_taste.note },
      texture: { direction: mapDirection(advice.impact_on_texture.direction), description: advice.impact_on_texture.note },
      authenticity: { direction: mapDirection(advice.authenticity_impact.direction), description: advice.authenticity_impact.note },
    },
    explanation: advice.notes,
    proTip: "When in doubt, make small adjustments and taste between each one.",
    source: {
      structured: false,
      ai: true,
      confidence: advice.confidence >= 0.75 ? "high" : advice.confidence >= 0.5 ? "medium" : "low",
    },
    arbitration: {
      tiersUsed: arb.tiersUsed,
      validationTriggered: arb.validationTriggered,
      validationReasons: arb.validationReasons,
      arbitrationTriggered: arb.arbitrationTriggered,
      arbitrationReason: arb.arbitrationReason,
      guardrailApplied: arb.guardrailApplied,
      guardrailCorrections: arb.guardrailCorrections,
    },
  };
}
