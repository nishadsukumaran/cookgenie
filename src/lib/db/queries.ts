/**
 * Database query helpers for CookGenie.
 *
 * Thin wrappers around Drizzle insert/select operations.
 * Each function is self-contained — gets its own db instance.
 */

import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./index";
import * as schema from "./schema";
import type { RescueQueryResponse, VariantChange, VariantTrustSnapshot } from "./schema";

// ─── Rescue Queries ─────────────────────────────────

export async function logRescueQuery(data: {
  userId?: string;
  sessionId?: string;
  recipeId?: string;
  userInput: string;
  detectedIntent: { category: string; subcategory?: string; confidence: number };
  problemType?: string;
  hadStructured: boolean;
  response: RescueQueryResponse;
}) {
  const db = getDb();
  const [row] = await db
    .insert(schema.rescueQueries)
    .values({
      userId: data.userId ?? null,
      sessionId: data.sessionId ?? null,
      recipeId: data.recipeId ?? null,
      userInput: data.userInput,
      detectedIntent: data.detectedIntent,
      problemType: data.problemType ?? null,
      hadStructured: data.hadStructured,
      response: data.response,
    })
    .returning({ id: schema.rescueQueries.id });
  return row.id;
}

// ─── AI Interactions ────────────────────────────────

export async function logAiInteraction(data: {
  userId?: string;
  taskType: string;
  model: string;
  tier?: string;
  inputSummary: string;
  inputContext?: Record<string, unknown>;
  outputConfidence?: number;
  outputScenarioType?: string;
  latencyMs: number;
  wasMock: boolean;
}) {
  const db = getDb();
  await db.insert(schema.aiInteractions).values({
    userId: data.userId ?? null,
    taskType: data.taskType,
    model: data.model,
    tier: data.tier ?? "primary",
    inputSummary: data.inputSummary.slice(0, 200),
    inputContext: data.inputContext ?? null,
    outputConfidence: data.outputConfidence?.toString() ?? null,
    outputScenarioType: data.outputScenarioType ?? null,
    latencyMs: data.latencyMs,
    wasMock: data.wasMock,
  });
}

// ─── Cooking Sessions ───────────────────────────────

export async function createCookingSession(data: {
  userId: string;
  recipeId: string;
  totalSteps: number;
  servingsUsed: number;
  transformations?: Record<string, unknown>;
}) {
  const db = getDb();
  const [row] = await db
    .insert(schema.cookingSessions)
    .values({
      userId: data.userId,
      recipeId: data.recipeId,
      totalSteps: data.totalSteps,
      servingsUsed: data.servingsUsed,
      transformations: data.transformations ?? {},
    })
    .returning({ id: schema.cookingSessions.id });
  return row.id;
}

export async function updateSessionStep(sessionId: string, step: number) {
  const db = getDb();
  await db
    .update(schema.cookingSessions)
    .set({ currentStep: step })
    .where(eq(schema.cookingSessions.id, sessionId));
}

export async function completeSession(sessionId: string) {
  const db = getDb();
  await db
    .update(schema.cookingSessions)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(schema.cookingSessions.id, sessionId));
}

export async function getActiveSessions(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.cookingSessions)
    .where(
      and(
        eq(schema.cookingSessions.userId, userId),
        eq(schema.cookingSessions.status, "in_progress")
      )
    )
    .orderBy(desc(schema.cookingSessions.startedAt));
}

// ─── Substitution Knowledge ─────────────────────────

export async function getSubstitutions(ingredientName: string) {
  const db = getDb();
  const name = ingredientName.toLowerCase().trim();
  return db
    .select()
    .from(schema.substitutionKnowledge)
    .where(eq(schema.substitutionKnowledge.original, name));
}

// ─── Recipes ────────────────────────────────────────

export async function getRecipeBySlug(slug: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.recipes)
    .where(eq(schema.recipes.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRecipeWithDetails(slug: string) {
  const db = getDb();
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return null;

  const [ingredients, steps] = await Promise.all([
    db
      .select()
      .from(schema.recipeIngredients)
      .where(eq(schema.recipeIngredients.recipeId, recipe.id))
      .orderBy(schema.recipeIngredients.sortOrder),
    db
      .select()
      .from(schema.recipeSteps)
      .where(eq(schema.recipeSteps.recipeId, recipe.id))
      .orderBy(schema.recipeSteps.stepNumber),
  ]);

  return { ...recipe, ingredients, steps };
}

// ─── Recipe Variants ────────────────────────────────

export async function saveVariant(data: {
  userId: string;
  baseRecipeId: string;
  name: string;
  servings: number;
  ingredientChanges: VariantChange[];
  trustMetrics: VariantTrustSnapshot;
  changeSummary: string;
}) {
  const db = getDb();
  const [row] = await db
    .insert(schema.recipeVariants)
    .values({
      userId: data.userId,
      baseRecipeId: data.baseRecipeId,
      name: data.name,
      servings: data.servings,
      ingredientChanges: data.ingredientChanges,
      trustMetrics: data.trustMetrics,
      changeSummary: data.changeSummary,
    })
    .returning({ id: schema.recipeVariants.id });
  return row.id;
}

export async function getUserVariants(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.recipeVariants)
    .where(eq(schema.recipeVariants.userId, userId))
    .orderBy(desc(schema.recipeVariants.createdAt));
}

export async function getVariantsForRecipe(userId: string, baseRecipeId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.recipeVariants)
    .where(
      and(
        eq(schema.recipeVariants.userId, userId),
        eq(schema.recipeVariants.baseRecipeId, baseRecipeId)
      )
    )
    .orderBy(desc(schema.recipeVariants.createdAt));
}

// ─── User Feedback ──────────────────────────────────

export async function submitFeedback(data: {
  userId?: string;
  targetType: string;
  targetId?: string;
  rating: string;
  notes?: string;
}) {
  const db = getDb();
  const [row] = await db
    .insert(schema.userFeedback)
    .values({
      userId: data.userId ?? null,
      targetType: data.targetType,
      targetId: data.targetId ?? null,
      rating: data.rating,
      notes: data.notes ?? null,
    })
    .returning({ id: schema.userFeedback.id });
  return row.id;
}

// ─── User Preferences ──────────────────────────────

export async function getPreferences(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertPreferences(
  userId: string,
  prefs: Partial<{
    spicePreference: string;
    dietary: string[];
    cuisines: string[];
    calorieGoal: number | null;
    authenticityPreference: string;
    unitSystem: string;
  }>
) {
  const db = getDb();
  const existing = await getPreferences(userId);
  if (existing) {
    await db
      .update(schema.userPreferences)
      .set({ ...prefs, updatedAt: new Date() })
      .where(eq(schema.userPreferences.userId, userId));
    return existing.id;
  }
  const [row] = await db
    .insert(schema.userPreferences)
    .values({ userId, ...prefs })
    .returning({ id: schema.userPreferences.id });
  return row.id;
}

// ─── Saved Recipes ─────────────────────────────────

export async function saveRecipe(userId: string, recipeId: string) {
  const db = getDb();
  await db
    .insert(schema.savedRecipes)
    .values({ userId, recipeId })
    .onConflictDoNothing();
}

export async function unsaveRecipe(userId: string, recipeId: string) {
  const db = getDb();
  await db
    .delete(schema.savedRecipes)
    .where(
      and(
        eq(schema.savedRecipes.userId, userId),
        eq(schema.savedRecipes.recipeId, recipeId)
      )
    );
}

export async function getSavedRecipes(userId: string) {
  const db = getDb();
  return db
    .select({
      savedAt: schema.savedRecipes.savedAt,
      recipeId: schema.recipes.id,
      slug: schema.recipes.slug,
      title: schema.recipes.title,
      description: schema.recipes.description,
      imageUrl: schema.recipes.imageUrl,
      cuisine: schema.recipes.cuisine,
      cookingTime: schema.recipes.cookingTime,
      prepTime: schema.recipes.prepTime,
      difficulty: schema.recipes.difficulty,
      rating: schema.recipes.rating,
      servings: schema.recipes.servings,
      calories: schema.recipes.calories,
      tags: schema.recipes.tags,
      aiSummary: schema.recipes.aiSummary,
    })
    .from(schema.savedRecipes)
    .innerJoin(
      schema.recipes,
      eq(schema.savedRecipes.recipeId, schema.recipes.id)
    )
    .where(eq(schema.savedRecipes.userId, userId))
    .orderBy(desc(schema.savedRecipes.savedAt));
}

// ─── Cooking History & Stats ──────────────────────────

export async function getCompletedSessions(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.cookingSessions)
    .where(
      and(
        eq(schema.cookingSessions.userId, userId),
        eq(schema.cookingSessions.status, "completed")
      )
    )
    .orderBy(desc(schema.cookingSessions.completedAt));
}

export async function getCookingStats(
  userId: string
): Promise<{ totalCompleted: number; totalMinutes: number }> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.cookingSessions)
    .where(
      and(
        eq(schema.cookingSessions.userId, userId),
        eq(schema.cookingSessions.status, "completed")
      )
    );

  let totalMinutes = 0;
  for (const row of rows) {
    const startMs = row.startedAt?.getTime() ?? 0;
    const endMs = row.completedAt?.getTime() ?? 0;
    if (startMs && endMs) {
      totalMinutes += Math.round((endMs - startMs) / 60_000);
    }
  }

  return { totalCompleted: rows.length, totalMinutes };
}
