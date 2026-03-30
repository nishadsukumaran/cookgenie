import { NextResponse } from "next/server";
import { detectIntent, intentToRescueProblem } from "@/lib/hybrid/intent";
import { getRescue } from "@/lib/engines/rescue";
import { findSubstitutesFor } from "@/lib/engines/substitution";
import { planCalorieReduction, estimateCalories, transformRecipe } from "@/lib/engines/transformation";
import { applyEdit } from "@/lib/engines/recipe-edit";
import type { EditAction } from "@/lib/engines/recipe-edit/types";
import { getRecipeById } from "@/data/mock-data";
import { ai } from "@/lib/ai";
import { arbitrate } from "@/lib/ai/arbitration";
import { logRescueQuery, logAiInteraction } from "@/lib/db/queries";
import type { HybridResponse } from "@/lib/hybrid/types";
import type { RescueQueryResponse } from "@/lib/db/schema";
import { createTrace, isDev } from "@/lib/debug/types";
import type { DebugTrace } from "@/lib/debug/types";

interface AskRequest {
  message: string;
  context?: {
    recipeName?: string;
    cuisine?: string;
    currentStep?: number;
    recipeId?: string;
    sessionId?: string;
  };
}

export async function POST(req: Request) {
  const body: AskRequest = await req.json();
  const { message, context } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const trace = createTrace();

  // ─── Intent Detection ─────────────────────────────
  const intentStart = Date.now();
  const intent = detectIntent(message);
  trace.addStage("intent", `Detected: ${intent.category}/${intent.subcategory ?? "none"}`, Date.now() - intentStart, {
    category: intent.category,
    subcategory: intent.subcategory ?? null,
    confidence: intent.confidence,
    entities: JSON.stringify(intent.entities),
  });

  let response: HybridResponse;
  let debugTrace: DebugTrace | undefined;

  switch (intent.category) {
    case "rescue":
      ({ response, trace: debugTrace } = await handleRescue(intent, message, context, trace));
      break;
    case "substitution":
      ({ response, trace: debugTrace } = await handleSubstitution(intent, message, context, trace));
      break;
    case "modification":
      ({ response, trace: debugTrace } = await handleModification(intent, message, context, trace));
      break;
    case "edit":
      ({ response, trace: debugTrace } = await handleEdit(intent, message, context, trace));
      break;
    case "scaling":
      ({ response, trace: debugTrace } = await handleScaling(intent, message, context, trace));
      break;
    default:
      ({ response, trace: debugTrace } = await handleGeneral(message, context, trace));
      break;
  }

  // Attach trace only in dev
  const payload = isDev() ? { ...response, _trace: debugTrace } : response;
  return NextResponse.json(payload);
}

// ─── Rescue Flow ────────────────────────────────────

async function handleRescue(
  intent: ReturnType<typeof detectIntent>,
  message: string,
  context: AskRequest["context"],
  trace: ReturnType<typeof createTrace>
): Promise<{ response: HybridResponse; trace: DebugTrace }> {
  const problem = intentToRescueProblem(intent);

  // Structured knowledge lookup
  const knowledgeStart = Date.now();
  const rescue = problem ? getRescue(problem) : null;
  const hadStructured = rescue?.found ?? false;
  trace.addStage("knowledge", hadStructured ? `Matched: ${problem}` : "No structured match", Date.now() - knowledgeStart, {
    problem: problem ?? "none",
    matched: hadStructured,
    structured_fix_used: hadStructured,
    urgency: rescue?.urgency ?? "n/a",
  });

  if (!hadStructured) trace.addFlag("no-structured-match");

  // ─── High-stakes arbitration for "slightly-burned" ──
  if (problem === "slightly-burned") {
    const arbStart = Date.now();
    const arbResult = await arbitrate({
      userInput: message,
      rescueProblem: problem,
      recipeName: context?.recipeName,
      cuisine: context?.cuisine,
      currentStep: context?.currentStep,
      hasStructuredKnowledge: hadStructured,
    });
    trace.addStage("arbitration", `Tiers: ${arbResult.tiersUsed}, validated: ${arbResult.validationTriggered}`, Date.now() - arbStart, {
      tiersUsed: arbResult.tiersUsed,
      validationTriggered: arbResult.validationTriggered,
      guardrailApplied: arbResult.guardrailApplied,
      validationReasons: arbResult.validationReasons.join("; ") || "none",
      arbitrationTriggered: arbResult.arbitrationTriggered,
      arbitrationReason: arbResult.arbitrationReason ?? "n/a",
      guardrailCorrections: arbResult.guardrailCorrections.join("; ") || "none",
    });

    const explanation = arbResult.final.notes;

    let response: HybridResponse;

    if (rescue?.found && rescue.solution) {
      const sol = rescue.solution;
      response = {
        type: "rescue",
        fix: {
          title: `Fix: ${sol.label}`,
          instruction: sol.immediateFix.instruction,
          ingredients: sol.immediateFix.ingredients,
          urgency: rescue.urgency === "high" ? "immediate" : "when-ready",
          duration: sol.immediateFix.duration,
        },
        alternatives: [{
          title: "Gradual Recovery",
          instruction: sol.gradualFix.instruction,
          ingredients: sol.gradualFix.ingredients,
          tradeoff: sol.gradualFix.duration ? `Takes ${sol.gradualFix.duration}` : "Takes longer but more thorough",
        }],
        impact: {
          taste: { direction: "better", description: "Following these fixes should restore the balance" },
          texture: { direction: "neutral", description: "No significant texture change expected" },
          authenticity: { direction: "neutral", description: "Standard cooking corrections" },
        },
        explanation,
        proTip: sol.preventionTip,
        source: {
          structured: true,
          ai: true,
          confidence: intent.confidence >= 0.7 ? "high" : "medium",
        },
      };
    } else {
      response = {
        type: "rescue",
        fix: { title: "CookPilot's Advice", instruction: explanation, urgency: "when-ready" },
        alternatives: [],
        impact: {
          taste: { direction: "neutral", description: "Depends on the specific situation" },
          texture: { direction: "neutral", description: "Depends on the specific situation" },
          authenticity: { direction: "neutral", description: "Depends on the specific situation" },
        },
        explanation,
        proTip: "When in doubt, make small adjustments and taste between each one.",
        source: { structured: false, ai: true, confidence: "low" },
      };
    }

    // Log rescue query
    const dbResponse: RescueQueryResponse = {
      fix: response.fix,
      alternatives: response.alternatives,
      impact: response.impact,
      confidence: response.source.confidence,
      tiersUsed: arbResult.tiersUsed,
      guardrailApplied: arbResult.guardrailApplied,
    };
    logRescueQuery({
      userInput: message,
      detectedIntent: { category: intent.category, subcategory: intent.subcategory, confidence: intent.confidence },
      problemType: problem ?? undefined,
      hadStructured,
      response: dbResponse,
      sessionId: context?.sessionId,
      recipeId: context?.recipeId,
    }).catch(() => {});

    trace.addStage("logging", "Logged to rescue_queries + ai_interactions", 0, { hadStructured });

    return {
      response,
      trace: trace.finish({ structured: hadStructured, ai: true, mock: false }),
    };
  }

  // ─── Standard single-model path (all other rescue problems) ──
  const aiStart = Date.now();
  const aiResult = await ai.rescueAdvice({
    problem: message,
    recipeName: context?.recipeName,
    cuisine: context?.cuisine,
    currentStep: context?.currentStep,
    structuredFix: rescue?.solution?.immediateFix.instruction,
  });
  trace.addStage("ai-enrichment", `Task: rescue-advice`, Date.now() - aiStart, {
    model: aiResult.model,
    latencyMs: aiResult.latencyMs,
    wasMock: aiResult.wasMock,
    responseLength: aiResult.content.length,
    ai_enrichment_used: true,
    ai_allowed_to_change_primary_fix: false,
  });

  if (aiResult.wasMock) trace.addFlag("ai-mock-response");

  // DB logging (fire-and-forget)
  logAiInteraction({
    taskType: "rescue-advice",
    model: aiResult.model,
    inputSummary: message,
    inputContext: { recipeName: context?.recipeName, problem: problem ?? message },
    outputScenarioType: "rescue",
    latencyMs: aiResult.latencyMs,
    wasMock: aiResult.wasMock,
  }).catch(() => {});

  let response: HybridResponse;

  if (rescue?.found && rescue.solution) {
    const sol = rescue.solution;
    response = {
      type: "rescue",
      fix: {
        title: `Fix: ${sol.label}`,
        instruction: sol.immediateFix.instruction,
        ingredients: sol.immediateFix.ingredients,
        urgency: rescue.urgency === "high" ? "immediate" : "when-ready",
        duration: sol.immediateFix.duration,
      },
      alternatives: [{
        title: "Gradual Recovery",
        instruction: sol.gradualFix.instruction,
        ingredients: sol.gradualFix.ingredients,
        tradeoff: sol.gradualFix.duration ? `Takes ${sol.gradualFix.duration}` : "Takes longer but more thorough",
      }],
      impact: {
        taste: { direction: "better", description: "Following these fixes should restore the balance" },
        texture: { direction: "neutral", description: "No significant texture change expected" },
        authenticity: { direction: "neutral", description: "Standard cooking corrections" },
      },
      explanation: aiResult.content,
      proTip: sol.preventionTip,
      source: {
        structured: true,
        ai: true,
        confidence: intent.confidence >= 0.7 ? "high" : "medium",
      },
    };
  } else {
    response = {
      type: "rescue",
      fix: { title: "CookPilot's Advice", instruction: aiResult.content, urgency: "when-ready" },
      alternatives: [],
      impact: {
        taste: { direction: "neutral", description: "Depends on the specific situation" },
        texture: { direction: "neutral", description: "Depends on the specific situation" },
        authenticity: { direction: "neutral", description: "Depends on the specific situation" },
      },
      explanation: aiResult.content,
      proTip: "When in doubt, make small adjustments and taste between each one.",
      source: { structured: false, ai: true, confidence: "low" },
    };
  }

  // Log rescue query
  const dbResponse: RescueQueryResponse = {
    fix: response.fix,
    alternatives: response.alternatives,
    impact: response.impact,
    confidence: response.source.confidence,
    tiersUsed: 1,
    guardrailApplied: false,
  };
  logRescueQuery({
    userInput: message,
    detectedIntent: { category: intent.category, subcategory: intent.subcategory, confidence: intent.confidence },
    problemType: problem ?? undefined,
    hadStructured,
    response: dbResponse,
    sessionId: context?.sessionId,
    recipeId: context?.recipeId,
  }).catch(() => {});

  trace.addStage("logging", "Logged to rescue_queries + ai_interactions", 0, { hadStructured });

  return {
    response,
    trace: trace.finish({ structured: hadStructured, ai: true, mock: aiResult.wasMock }),
  };
}

// ─── Substitution Flow ──────────────────────────────

async function handleSubstitution(
  intent: ReturnType<typeof detectIntent>,
  message: string,
  context: AskRequest["context"],
  trace: ReturnType<typeof createTrace>
): Promise<{ response: HybridResponse; trace: DebugTrace }> {
  const ingredientName = intent.entities.ingredient || intent.entities.original || "";

  const lookupStart = Date.now();
  const result = findSubstitutesFor(ingredientName);
  trace.addStage("knowledge", result.found ? `Found: ${result.original}` : `No match for "${ingredientName}"`, Date.now() - lookupStart, {
    ingredient: ingredientName,
    matched: result.found,
    bestSub: result.best?.name ?? "none",
    score: result.best?.score ?? 0,
  });

  let aiExplanation = "";
  let wasMock = true;

  if (result.found && result.best) {
    const aiStart = Date.now();
    const aiResult = await ai.substitutionAnalysis({
      recipeName: context?.recipeName,
      original: result.original,
      substitute: result.best.name,
      cuisine: context?.cuisine,
    });
    aiExplanation = aiResult.content;
    wasMock = aiResult.wasMock;
    trace.addStage("ai-enrichment", "Task: substitution-analysis", Date.now() - aiStart, {
      model: aiResult.model,
      latencyMs: aiResult.latencyMs,
      wasMock: aiResult.wasMock,
    });

    logAiInteraction({
      taskType: "substitution-analysis",
      model: aiResult.model,
      inputSummary: message,
      inputContext: { original: result.original, substitute: result.best.name },
      latencyMs: aiResult.latencyMs,
      wasMock: aiResult.wasMock,
    }).catch(() => {});
  } else {
    trace.addFlag("no-structured-match");
  }

  let response: HybridResponse;

  if (result.found && result.best) {
    const best = result.best;
    response = {
      type: "substitution",
      fix: { title: `Best Substitute: ${best.name}`, instruction: best.quantityInstruction, urgency: "when-ready" },
      alternatives: result.all.filter((s) => s.name !== best.name).map((s) => ({
        title: s.name, instruction: s.quantityInstruction,
        tradeoff: `${s.scoreLabel} (${s.score}% match) — ${s.impact.summary}`,
      })),
      impact: {
        taste: { direction: best.impact.taste.score >= 4 ? "neutral" : "different", description: best.impact.taste.description },
        texture: { direction: best.impact.texture.score >= 4 ? "neutral" : "different", description: best.impact.texture.description },
        authenticity: { direction: best.impact.authenticity.score >= 4 ? "neutral" : best.impact.authenticity.score >= 3 ? "different" : "worse", description: best.impact.authenticity.description },
      },
      explanation: aiExplanation,
      proTip: `${best.name} scores ${best.score}% compatibility as a replacement for ${result.original}.`,
      source: { structured: true, ai: !!aiExplanation, confidence: "high" },
    };
  } else {
    const aiResult = await ai.recipeReasoning({ recipeName: context?.recipeName || "the dish", question: message, cuisine: context?.cuisine });
    response = {
      type: "substitution",
      fix: { title: "CookPilot's Suggestion", instruction: aiResult.content, urgency: "when-ready" },
      alternatives: [],
      impact: {
        taste: { direction: "neutral", description: "Ask CookPilot for specifics" },
        texture: { direction: "neutral", description: "Ask CookPilot for specifics" },
        authenticity: { direction: "neutral", description: "Ask CookPilot for specifics" },
      },
      explanation: aiResult.content,
      proTip: "When substituting, add at the same cooking stage as the original.",
      source: { structured: false, ai: true, confidence: "low" },
    };
    wasMock = aiResult.wasMock;
  }

  return {
    response,
    trace: trace.finish({ structured: result.found, ai: true, mock: wasMock }),
  };
}

// ─── Modification Flow ──────────────────────────────

async function handleModification(
  intent: ReturnType<typeof detectIntent>,
  message: string,
  context: AskRequest["context"],
  trace: ReturnType<typeof createTrace>
): Promise<{ response: HybridResponse; trace: DebugTrace }> {
  // Default to butter chicken if no recipe context
  const recipeId = context?.recipeId || "butter-chicken";
  const recipe = getRecipeById(recipeId);

  if (!recipe) {
    const aiResult = await ai.recipeReasoning({ recipeName: "unknown", question: message });
    return {
      response: {
        type: "general",
        fix: { title: "CookPilot Says", instruction: aiResult.content, urgency: "optional" },
        alternatives: [], impact: { taste: { direction: "neutral", description: "" }, texture: { direction: "neutral", description: "" }, authenticity: { direction: "neutral", description: "" } },
        explanation: aiResult.content, proTip: "", source: { structured: false, ai: true, confidence: "low" },
      },
      trace: trace.finish({ structured: false, ai: true, mock: aiResult.wasMock }),
    };
  }

  // Determine target reduction
  const percentStr = intent.entities.percent;
  const reductionPercent = percentStr ? parseInt(percentStr, 10) : 20;
  const servings = recipe.servings;
  const currentCalories = estimateCalories(recipe.ingredients, servings);
  const targetCals = Math.round(currentCalories * (1 - reductionPercent / 100));

  // Structured engine calculation
  const calcStart = Date.now();
  const plan = planCalorieReduction(recipe.ingredients, servings, targetCals, "smart-swap");
  trace.addStage("engine", `Calorie plan: ${currentCalories} → ${targetCals} cal/serving`, Date.now() - calcStart, {
    structured_modification_used: true,
    originalCalories: currentCalories,
    targetCalories: targetCals,
    reductionPercent: plan.reductionPercent,
    modificationsCount: plan.modifications.length,
  });

  // Build plan summary for AI
  const planSummary = plan.modifications.length > 0
    ? plan.modifications.map((m) =>
        `- ${m.ingredient}: ${m.originalAmount} ${m.unit} → ${m.newAmount} ${m.unit} (saves ~${m.caloriesSaved} cal/serving)`
      ).join("\n") + `\nResult: ${currentCalories} → ~${targetCals} cal/serving (${plan.reductionPercent}% reduction)`
    : "No reductions needed.";

  // AI enrichment
  const aiStart = Date.now();
  const aiResult = await ai.modificationAnalysis({
    recipeName: recipe.title,
    cuisine: recipe.cuisine,
    modificationType: intent.subcategory || "reduce-calories",
    structuredPlan: planSummary,
  });
  trace.addStage("ai-enrichment", "Task: modification-analysis", Date.now() - aiStart, {
    model: aiResult.model,
    latencyMs: aiResult.latencyMs,
    wasMock: aiResult.wasMock,
    responseLength: aiResult.content.length,
    ai_enrichment_used: true,
    ai_allowed_to_change_primary_modification: false,
  });

  if (aiResult.wasMock) trace.addFlag("ai-mock-response");

  logAiInteraction({
    taskType: "modification-analysis",
    model: aiResult.model,
    inputSummary: `${intent.subcategory}: ${recipe.title} (${plan.reductionPercent}%)`,
    inputContext: { recipeId, modificationType: intent.subcategory, reductionPercent: plan.reductionPercent },
    latencyMs: aiResult.latencyMs,
    wasMock: aiResult.wasMock,
  }).catch(() => {});

  // Build warnings
  const warnings: string[] = [];
  if (plan.reductionPercent > 30) warnings.push("Large reduction — taste and texture will be noticeably different.");
  if (plan.modifications.some((m) => m.ingredient.toLowerCase().includes("cream") && m.newAmount / m.originalAmount < 0.5)) {
    warnings.push("Cream reduced significantly — creaminess will be affected.");
  }

  // Map to HybridResponse
  const changeSummary = plan.modifications.map((m) =>
    `${m.ingredient}: ${m.originalAmount} → ${m.newAmount} ${m.unit} (saves ${m.caloriesSaved} cal)`
  ).join("; ");

  const response: HybridResponse = {
    type: "explanation",
    fix: {
      title: `Modify: ${reductionPercent}% Calorie Reduction`,
      instruction: plan.modifications.length > 0
        ? `Reduce ${plan.modifications.length} ingredient(s): ${changeSummary}. Total: ${currentCalories} → ${targetCals} cal/serving.`
        : "No reductions needed — the dish is already at the target level.",
      urgency: "when-ready",
    },
    alternatives: plan.modifications.length > 1
      ? [{ title: "Proportional reduction", instruction: "Reduce all ingredients equally instead of targeting fats first.", tradeoff: "Simpler but affects flavor more evenly across all ingredients." }]
      : [],
    impact: {
      taste: {
        direction: plan.reductionPercent > 20 ? "different" : plan.reductionPercent > 10 ? "neutral" : "neutral",
        description: plan.reductionPercent > 20 ? "Lighter, less rich" : "Minimal taste change",
      },
      texture: {
        direction: plan.reductionPercent > 25 ? "different" : "neutral",
        description: plan.reductionPercent > 25 ? "Less creamy mouthfeel" : "Minimal texture change",
      },
      authenticity: {
        direction: plan.reductionPercent > 30 ? "worse" : plan.reductionPercent > 15 ? "different" : "neutral",
        description: plan.reductionPercent > 30 ? "Adapted healthy version" : "Still recognizably authentic",
      },
    },
    explanation: aiResult.content,
    proTip: warnings.length > 0 ? warnings[0] : `${plan.reductionPercent}% reduction while preserving the core spice profile.`,
    source: {
      structured: true,
      ai: true,
      confidence: plan.reductionPercent <= 25 ? "high" : "medium",
    },
  };

  return {
    response,
    trace: trace.finish({ structured: true, ai: true, mock: aiResult.wasMock }),
  };
}

// ─── Scaling Flow ────────────────────────────────────

async function handleScaling(
  intent: ReturnType<typeof detectIntent>,
  message: string,
  context: AskRequest["context"],
  trace: ReturnType<typeof createTrace>
): Promise<{ response: HybridResponse; trace: DebugTrace }> {
  const recipeId = context?.recipeId || "butter-chicken";
  const recipe = getRecipeById(recipeId);

  if (!recipe) {
    const aiResult = await ai.recipeReasoning({ recipeName: "unknown", question: message });
    return {
      response: {
        type: "general",
        fix: { title: "CookPilot Says", instruction: aiResult.content, urgency: "optional" },
        alternatives: [], impact: { taste: { direction: "neutral", description: "" }, texture: { direction: "neutral", description: "" }, authenticity: { direction: "neutral", description: "" } },
        explanation: aiResult.content, proTip: "", source: { structured: false, ai: true, confidence: "low" },
      },
      trace: trace.finish({ structured: false, ai: true, mock: aiResult.wasMock }),
    };
  }

  // Extract target servings from intent entities or message
  let targetServings = recipe.servings;
  const servingsMatch = message.match(/(\d+)\s*(?:people|servings|portions)/i);
  const multiplierMatch = message.match(/\b(double|triple|halve|half)\b/i);

  if (intent.entities.targetServings) {
    targetServings = parseInt(intent.entities.targetServings, 10);
  } else if (servingsMatch) {
    targetServings = parseInt(servingsMatch[1], 10);
  } else if (multiplierMatch) {
    const word = multiplierMatch[1].toLowerCase();
    if (word === "double") targetServings = recipe.servings * 2;
    else if (word === "triple") targetServings = recipe.servings * 3;
    else if (word === "halve" || word === "half") targetServings = Math.max(1, Math.round(recipe.servings / 2));
  }

  // Run transformation engine
  const engineStart = Date.now();
  const result = transformRecipe(recipe.ingredients, recipe.servings, recipe.calories, {
    targetServings,
  });
  trace.addStage("engine", `Scale: ${recipe.servings} → ${targetServings} servings`, Date.now() - engineStart, {
    structured_scaling_used: true,
    originalServings: recipe.servings,
    targetServings,
    warningsCount: result.warnings.length,
  });

  // AI explanation
  const aiStart = Date.now();
  const aiResult = await ai.recipeReasoning({
    recipeName: recipe.title,
    question: `I'm scaling this recipe from ${recipe.servings} to ${targetServings} servings. What should I watch out for?`,
    cuisine: recipe.cuisine,
  });
  trace.addStage("ai-enrichment", "Task: scaling advice", Date.now() - aiStart, {
    model: aiResult.model, latencyMs: aiResult.latencyMs, wasMock: aiResult.wasMock,
    ai_enrichment_used: true,
  });

  logAiInteraction({
    taskType: "recipe-reasoning", model: aiResult.model,
    inputSummary: `scale ${recipe.title}: ${recipe.servings}→${targetServings}`,
    latencyMs: aiResult.latencyMs, wasMock: aiResult.wasMock,
  }).catch(() => {});

  // Build scaled ingredients summary
  const scaledSummary = result.ingredients
    .slice(0, 5)
    .map((i) => `${i.name}: ${i.amount} ${i.unit}`)
    .join(", ");

  const response: HybridResponse = {
    type: "explanation",
    fix: {
      title: `Scaled: ${recipe.servings} → ${targetServings} servings`,
      instruction: `Recipe scaled to ${targetServings} servings. Key ingredients: ${scaledSummary}. Calories per serving: ${result.calories}.${result.warnings.length > 0 ? ` Note: ${result.warnings[0].message}` : ""}`,
      urgency: "when-ready",
    },
    alternatives: [],
    impact: {
      taste: { direction: "neutral", description: "Taste unchanged — only portion size adjusted" },
      texture: { direction: "neutral", description: "Texture unchanged" },
      authenticity: { direction: "neutral", description: "Fully authentic — scaling preserves the recipe" },
    },
    explanation: aiResult.content,
    proTip: targetServings > recipe.servings * 3
      ? "For very large batches, consider cooking in multiple pots for even heat distribution."
      : `Scaled from ${recipe.servings} to ${targetServings} servings. Spices are scaled conservatively — taste and adjust.`,
    source: { structured: true, ai: true, confidence: "high" },
  };

  return {
    response,
    trace: trace.finish({ structured: true, ai: true, mock: aiResult.wasMock }),
  };
}

// ─── Edit Flow ─────────────────────────────────────

async function handleEdit(
  intent: ReturnType<typeof detectIntent>,
  message: string,
  context: AskRequest["context"],
  trace: ReturnType<typeof createTrace>
): Promise<{ response: HybridResponse; trace: DebugTrace }> {
  // Handle "save" subcategory — no edit engine needed
  if (intent.subcategory === "save") {
    const response: HybridResponse = {
      type: "general",
      fix: {
        title: "Save Your Recipe",
        instruction: "To save this recipe, use the save variant dialog from the recipe page. You can save your customised version there.",
        urgency: "optional",
      },
      alternatives: [],
      impact: {
        taste: { direction: "neutral", description: "" },
        texture: { direction: "neutral", description: "" },
        authenticity: { direction: "neutral", description: "" },
      },
      explanation: "Use the save variant dialog to store your edited recipe.",
      proTip: "",
      source: { structured: false, ai: false, confidence: "high" },
    };
    return { response, trace: trace.finish({ structured: false, ai: false, mock: false }) };
  }

  // Get recipe from context or default to butter chicken
  const recipeId = context?.recipeId || "butter-chicken";
  const recipe = getRecipeById(recipeId);

  if (!recipe) {
    const aiResult = await ai.recipeReasoning({ recipeName: "unknown", question: message });
    return {
      response: {
        type: "general",
        fix: { title: "CookPilot Says", instruction: aiResult.content, urgency: "optional" },
        alternatives: [],
        impact: {
          taste: { direction: "neutral", description: "" },
          texture: { direction: "neutral", description: "" },
          authenticity: { direction: "neutral", description: "" },
        },
        explanation: aiResult.content,
        proTip: "",
        source: { structured: false, ai: true, confidence: "low" },
      },
      trace: trace.finish({ structured: false, ai: true, mock: aiResult.wasMock }),
    };
  }

  // Extract entities
  const ingredientName = intent.entities.ingredient || "";
  const replacementName = intent.entities.replacement || "";

  // Build EditAction from subcategory
  let action: EditAction;

  switch (intent.subcategory) {
    case "remove":
      action = { type: "remove", ingredientName };
      break;
    case "replace":
      action = {
        type: "replace",
        ingredientName,
        replacement: {
          name: replacementName,
          amount: 0,
          unit: "to taste",
          category: "other" as const,
        },
      };
      break;
    case "add":
      action = {
        type: "add",
        ingredientName,
        newIngredient: {
          name: ingredientName,
          amount: 1,
          unit: "to taste",
          category: "other" as const,
        },
      };
      break;
    default:
      action = { type: "remove", ingredientName };
      break;
  }

  // Apply the structured edit
  const engineStart = Date.now();
  const editResult = applyEdit(recipe.ingredients, action);
  trace.addStage("engine", `Edit: ${action.type} ${ingredientName}`, Date.now() - engineStart, {
    structured_edit_used: true,
    editType: action.type,
    ingredient: ingredientName,
    success: editResult.success,
    warningsCount: editResult.warnings.length,
  });

  // AI enrichment — explain the impact
  const aiStart = Date.now();
  const aiResult = await ai.recipeReasoning({
    recipeName: recipe.title,
    question: editResult.impact.summary,
    cuisine: recipe.cuisine,
  });
  trace.addStage("ai-enrichment", "Task: recipe-reasoning (edit impact)", Date.now() - aiStart, {
    model: aiResult.model,
    latencyMs: aiResult.latencyMs,
    wasMock: aiResult.wasMock,
    responseLength: aiResult.content.length,
    ai_enrichment_used: true,
    ai_allowed_to_change_edit: false,
  });

  if (aiResult.wasMock) trace.addFlag("ai-mock-response");

  logAiInteraction({
    taskType: "recipe-reasoning",
    model: aiResult.model,
    inputSummary: `edit/${intent.subcategory}: ${ingredientName} in ${recipe.title}`,
    inputContext: { recipeId, editType: action.type, ingredient: ingredientName },
    latencyMs: aiResult.latencyMs,
    wasMock: aiResult.wasMock,
  }).catch(() => {});

  // Map impact levels to HybridResponse directions
  const directionMap = (level: "none" | "minor" | "significant") =>
    level === "significant" ? "different" as const : "neutral" as const;

  const response: HybridResponse = {
    type: "explanation",
    fix: {
      title: `Edit: ${action.type} ${ingredientName}`,
      instruction: editResult.success
        ? editResult.impact.summary
        : `Could not apply edit: ${editResult.warnings.join("; ")}`,
      urgency: "when-ready",
    },
    alternatives: [],
    impact: {
      taste: {
        direction: directionMap(editResult.impact.tasteChange),
        description: editResult.impact.tasteChange === "none" ? "No taste change expected" : `Taste impact: ${editResult.impact.tasteChange}`,
      },
      texture: {
        direction: directionMap(editResult.impact.textureChange),
        description: editResult.impact.textureChange === "none" ? "No texture change expected" : `Texture impact: ${editResult.impact.textureChange}`,
      },
      authenticity: {
        direction: directionMap(editResult.impact.authenticityChange),
        description: editResult.impact.authenticityChange === "none" ? "Authenticity preserved" : `Authenticity impact: ${editResult.impact.authenticityChange}`,
      },
    },
    explanation: aiResult.content,
    proTip: editResult.warnings.length > 0 ? editResult.warnings[0] : "",
    source: {
      structured: true,
      ai: true,
      confidence: editResult.success ? "high" : "medium",
    },
  };

  return {
    response,
    trace: trace.finish({ structured: true, ai: true, mock: aiResult.wasMock }),
  };
}

// ─── General Flow ───────────────────────────────────

async function handleGeneral(
  message: string,
  context: AskRequest["context"],
  trace: ReturnType<typeof createTrace>
): Promise<{ response: HybridResponse; trace: DebugTrace }> {
  const aiStart = Date.now();
  const aiResult = await ai.recipeReasoning({
    recipeName: context?.recipeName || "your dish",
    question: message,
    cuisine: context?.cuisine,
  });
  trace.addStage("ai-only", "Task: recipe-reasoning", Date.now() - aiStart, {
    model: aiResult.model, latencyMs: aiResult.latencyMs, wasMock: aiResult.wasMock,
  });
  trace.addFlag("ai-only-no-structured-knowledge");

  logAiInteraction({
    taskType: "recipe-reasoning", model: aiResult.model, inputSummary: message,
    latencyMs: aiResult.latencyMs, wasMock: aiResult.wasMock,
  }).catch(() => {});

  const response: HybridResponse = {
    type: "general",
    fix: { title: "CookPilot Says", instruction: aiResult.content, urgency: "optional" },
    alternatives: [],
    impact: { taste: { direction: "neutral", description: "" }, texture: { direction: "neutral", description: "" }, authenticity: { direction: "neutral", description: "" } },
    explanation: aiResult.content, proTip: "",
    source: { structured: false, ai: true, confidence: "medium" },
  };

  return { response, trace: trace.finish({ structured: false, ai: true, mock: aiResult.wasMock }) };
}
