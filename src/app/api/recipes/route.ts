/**
 * GET /api/recipes — list published recipes from Neon.
 *
 * Returns all recipes where is_published = true OR is_user_recipe = true
 * (dev-user owned). Joins with recipe_ingredients and recipe_steps so each
 * recipe is shaped to match the frontend Recipe type from mock-data.ts.
 *
 * Query params:
 *   ?q=<search> — filters by title ILIKE or cuisine ILIKE
 *
 * Response: { recipes: Recipe[] }
 */

import { type NextRequest } from "next/server";
import { eq, or, ilike, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const dynamic = "force-dynamic";

interface ShapedRecipe {
  id: string;
  title: string;
  description: string;
  image: string;
  cuisine: string;
  cookingTime: number;
  prepTime: number;
  difficulty: string;
  rating: number;
  servings: number;
  calories: number;
  tags: string[];
  aiSummary: string;
  ingredients: {
    name: string;
    amount: number;
    unit: string;
    category: string;
  }[];
  steps: {
    number: number;
    instruction: string;
    duration?: number;
    tip?: string;
  }[];
  substitutions: never[];
}

function shapeRecipe(
  recipe: typeof schema.recipes.$inferSelect,
  ingredients: (typeof schema.recipeIngredients.$inferSelect)[],
  steps: (typeof schema.recipeSteps.$inferSelect)[],
): ShapedRecipe {
  return {
    id: recipe.slug,
    title: recipe.title,
    description: recipe.description ?? "",
    image: recipe.imageUrl ?? `/images/${recipe.slug}.jpg`,
    cuisine: recipe.cuisine,
    cookingTime: recipe.cookingTime,
    prepTime: recipe.prepTime,
    difficulty: recipe.difficulty,
    rating: Number(recipe.rating) || 0,
    servings: recipe.servings,
    calories: recipe.calories ?? 0,
    tags: recipe.tags ?? [],
    aiSummary: recipe.aiSummary ?? "",
    ingredients: ingredients.map((ing) => ({
      name: ing.name,
      amount: Number(ing.amount),
      unit: ing.unit,
      category: ing.category,
    })),
    steps: steps.map((s) => ({
      number: s.stepNumber,
      instruction: s.instruction,
      ...(s.duration != null ? { duration: s.duration } : {}),
      ...(s.tip != null ? { tip: s.tip } : {}),
    })),
    // Substitutions live in substitution_knowledge table, not embedded.
    // Return empty array to keep shape compatible with the mock Recipe type.
    substitutions: [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const q = request.nextUrl.searchParams.get("q")?.trim();

    // ─── Fetch recipes ────────────────────────────────
    let recipeRows: (typeof schema.recipes.$inferSelect)[];

    if (q) {
      const pattern = `%${q}%`;
      recipeRows = await db
        .select()
        .from(schema.recipes)
        .where(
          or(
            ilike(schema.recipes.title, pattern),
            ilike(schema.recipes.cuisine, pattern),
          ),
        )
        .orderBy(desc(schema.recipes.rating));
    } else {
      recipeRows = await db
        .select()
        .from(schema.recipes)
        .where(
          or(
            eq(schema.recipes.isPublished, true),
            eq(schema.recipes.isUserRecipe, true),
          ),
        )
        .orderBy(desc(schema.recipes.rating));
    }

    if (recipeRows.length === 0) {
      return Response.json({ recipes: [] });
    }

    // ─── Fetch related ingredients + steps in bulk ────
    const recipeIds = recipeRows.map((r) => r.id);

    const [allIngredients, allSteps] = await Promise.all([
      db
        .select()
        .from(schema.recipeIngredients)
        .where(
          or(...recipeIds.map((id) => eq(schema.recipeIngredients.recipeId, id))),
        )
        .orderBy(schema.recipeIngredients.sortOrder),
      db
        .select()
        .from(schema.recipeSteps)
        .where(
          or(...recipeIds.map((id) => eq(schema.recipeSteps.recipeId, id))),
        )
        .orderBy(schema.recipeSteps.stepNumber),
    ]);

    // ─── Group by recipeId ────────────────────────────
    const ingredientsByRecipe = new Map<
      string,
      (typeof schema.recipeIngredients.$inferSelect)[]
    >();
    for (const ing of allIngredients) {
      const arr = ingredientsByRecipe.get(ing.recipeId) ?? [];
      arr.push(ing);
      ingredientsByRecipe.set(ing.recipeId, arr);
    }

    const stepsByRecipe = new Map<
      string,
      (typeof schema.recipeSteps.$inferSelect)[]
    >();
    for (const step of allSteps) {
      const arr = stepsByRecipe.get(step.recipeId) ?? [];
      arr.push(step);
      stepsByRecipe.set(step.recipeId, arr);
    }

    // ─── Shape response ───────────────────────────────
    const recipes = recipeRows.map((r) =>
      shapeRecipe(
        r,
        ingredientsByRecipe.get(r.id) ?? [],
        stepsByRecipe.get(r.id) ?? [],
      ),
    );

    return Response.json({ recipes });
  } catch (error) {
    console.error("[GET /api/recipes]", error);
    return Response.json(
      { error: "Failed to fetch recipes" },
      { status: 500 },
    );
  }
}
