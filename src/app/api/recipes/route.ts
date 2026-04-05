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
import { eq, or, and, ilike, desc, lt, gte, gt, sql } from "drizzle-orm";
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
    image: recipe.imageUrl ?? "/images/generic-recipe.jpg",
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
    const params = request.nextUrl.searchParams;
    const q = params.get("q")?.trim();
    const cuisine = params.get("cuisine")?.trim();
    const time = params.get("time")?.trim();
    const difficulty = params.get("difficulty")?.trim();
    const dietary = params.get("dietary")?.trim();

    // Validate enum inputs
    const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"];
    const VALID_DIETARY = ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free"];
    const VALID_TIMES = ["under-30", "30-60", "60-plus"];

    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      return Response.json({ recipes: [] });
    }
    if (dietary && !VALID_DIETARY.includes(dietary)) {
      return Response.json({ recipes: [] });
    }
    if (time && !VALID_TIMES.includes(time)) {
      return Response.json({ recipes: [] });
    }

    // ─── Build WHERE conditions ───────────────────────
    const conditions = [];

    // Text search
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(schema.recipes.title, pattern),
          ilike(schema.recipes.cuisine, pattern),
          ilike(schema.recipes.description, pattern),
        ),
      );
    }

    // Cuisine filter
    if (cuisine) {
      conditions.push(eq(schema.recipes.cuisine, cuisine));
    }

    // Time filter
    if (time === "under-30") {
      conditions.push(lt(schema.recipes.cookingTime, 30));
    } else if (time === "30-60") {
      conditions.push(gte(schema.recipes.cookingTime, 30));
      conditions.push(lt(schema.recipes.cookingTime, 61));
    } else if (time === "60-plus") {
      conditions.push(gt(schema.recipes.cookingTime, 60));
    }

    // Difficulty filter
    if (difficulty) {
      conditions.push(eq(schema.recipes.difficulty, difficulty));
    }

    // Dietary filter (check tags array)
    if (dietary) {
      conditions.push(sql`${dietary} = ANY(${schema.recipes.tags})`);
    }

    // Default: show published or user recipes when no filters
    if (conditions.length === 0) {
      conditions.push(
        or(
          eq(schema.recipes.isPublished, true),
          eq(schema.recipes.isUserRecipe, true),
        ),
      );
    }

    // ─── Fetch recipes ────────────────────────────────
    const recipeRows = await db
      .select()
      .from(schema.recipes)
      .where(and(...conditions))
      .orderBy(desc(schema.recipes.rating));

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
