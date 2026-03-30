/**
 * GET /api/recipes/[slug] — fetch a single recipe by slug.
 *
 * Uses getRecipeWithDetails from queries.ts and shapes the response
 * to match the frontend Recipe type from mock-data.ts.
 *
 * Returns 404 if no recipe is found for the given slug.
 */

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
