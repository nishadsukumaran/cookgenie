/**
 * GET /api/recipes/[slug] — fetch a single recipe by slug.
 *
 * Uses getRecipeWithDetails from queries.ts and shapes the response
 * to match the frontend Recipe type from mock-data.ts.
 *
 * Returns 404 if no recipe is found for the given slug.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getRecipeWithDetails } from "@/lib/db/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const result = await getRecipeWithDetails(slug);

    if (!result) {
      return Response.json(
        { error: "Recipe not found" },
        { status: 404 },
      );
    }

    const { ingredients, steps, ...recipe } = result;

    const shaped = {
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
      substitutions: [],
    };

    return Response.json({ recipe: shaped });
  } catch (error) {
    console.error("[GET /api/recipes/[slug]]", error);
    return Response.json(
      { error: "Failed to fetch recipe" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/recipes/[slug] — delete an imported recipe.
 *
 * Only allows deleting AI-imported recipes (sourceUrl = 'ai-generated').
 * Seeded/published recipes cannot be deleted.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const db = getDb();

    // Find the recipe and verify it's an AI import
    const [recipe] = await db
      .select({ id: schema.recipes.id, sourceUrl: schema.recipes.sourceUrl })
      .from(schema.recipes)
      .where(eq(schema.recipes.slug, slug));

    if (!recipe) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    if (recipe.sourceUrl !== "ai-generated") {
      return Response.json(
        { error: "Only imported recipes can be deleted" },
        { status: 403 },
      );
    }

    // Delete in order: steps, ingredients, then recipe
    await db.delete(schema.recipeSteps).where(eq(schema.recipeSteps.recipeId, recipe.id));
    await db.delete(schema.recipeIngredients).where(eq(schema.recipeIngredients.recipeId, recipe.id));
    await db.delete(schema.recipes).where(eq(schema.recipes.id, recipe.id));

    return Response.json({ ok: true, deleted: slug });
  } catch (error) {
    console.error("[DELETE /api/recipes/[slug]]", error);
    return Response.json(
      { error: "Failed to delete recipe" },
      { status: 500 },
    );
  }
}
