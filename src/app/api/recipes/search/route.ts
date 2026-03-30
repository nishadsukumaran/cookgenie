import { NextResponse } from "next/server";
import { ai } from "@/lib/ai";
import { logAiInteraction } from "@/lib/db/queries";
import { createTrace, isDev } from "@/lib/debug/types";
import type { Ingredient, CookingStep } from "@/lib/engines/types";

const DEV_USER = "dev-user";

interface RecipeCandidate {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  cookingTime: number;
  prepTime: number;
  difficulty: string;
  servings: number;
  calories: number;
  tags: string[];
  ingredients: Ingredient[];
  steps: CookingStep[];
  source: "ai-generated";
}

export async function POST(req: Request) {
  const body = await req.json();
  const { query } = body as { query: string };

  if (!query?.trim()) {
    return NextResponse.json(
      { error: "query is required" },
      { status: 400 },
    );
  }

  const trace = createTrace();

  // ─── AI Generation ───────────────────────────────
  const aiStart = Date.now();
  const aiResult = await ai.recipeGeneration({ query, count: 3 });

  trace.addStage("ai-generation", "Task: recipe-generation", Date.now() - aiStart, {
    model: aiResult.model,
    latencyMs: aiResult.latencyMs,
    wasMock: aiResult.wasMock,
    responseLength: aiResult.content.length,
  });

  if (aiResult.wasMock) trace.addFlag("ai-mock-response");

  // Fire-and-forget AI interaction log
  logAiInteraction({
    userId: DEV_USER,
    taskType: "recipe-generation",
    model: aiResult.model,
    inputSummary: query,
    inputContext: { query, count: 3 },
    latencyMs: aiResult.latencyMs,
    wasMock: aiResult.wasMock,
  }).catch(() => {});

  // ─── Parse JSON Response ─────────────────────────
  let candidates: RecipeCandidate[] = [];
  let parseError: string | undefined;

  try {
    const raw = JSON.parse(aiResult.content);
    const arr = Array.isArray(raw) ? raw : [raw];

    candidates = arr.map((r: Record<string, unknown>) => ({
      id: crypto.randomUUID(),
      title: (r.title as string) ?? "Untitled Recipe",
      description: (r.description as string) ?? "",
      cuisine: (r.cuisine as string) ?? "International",
      cookingTime: (r.cookingTime as number) ?? 30,
      prepTime: (r.prepTime as number) ?? 15,
      difficulty: (r.difficulty as string) ?? "Medium",
      servings: (r.servings as number) ?? 4,
      calories: (r.calories as number) ?? 0,
      tags: (r.tags as string[]) ?? [],
      ingredients: ((r.ingredients as Ingredient[]) ?? []).map((ing) => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        category: ing.category ?? "other",
      })),
      steps: ((r.steps as CookingStep[]) ?? []).map((step) => ({
        number: step.number,
        instruction: step.instruction,
        duration: step.duration,
        tip: step.tip,
      })),
      source: "ai-generated" as const,
    }));

    trace.addStage("json-parse", `Parsed ${candidates.length} candidates`, 0, {
      candidateCount: candidates.length,
    });
  } catch (err) {
    parseError = err instanceof Error ? err.message : "Failed to parse AI response";
    trace.addFlag("json-parse-failed");
    trace.addStage("json-parse", "FAILED", 0, {
      error: parseError,
    });
  }

  // ─── Build Response ──────────────────────────────
  const payload: Record<string, unknown> = { candidates };
  if (parseError) payload.error = parseError;

  if (isDev()) {
    payload._trace = trace.finish({
      structured: false,
      ai: true,
      mock: aiResult.wasMock,
    });
  }

  return NextResponse.json(payload);
}
