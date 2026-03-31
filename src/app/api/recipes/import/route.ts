import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import type { Ingredient, CookingStep } from "@/lib/engines/types";

const DEV_USER = "dev-user";

interface ImportRecipeRequest {
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
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(req: Request) {
  try {
    const body: ImportRecipeRequest = await req.json();
    const {
      title,
      description,
      cuisine,
      cookingTime,
      prepTime,
      difficulty,
      servings,
      calories,
      tags,
      ingredients,
      steps,
    } = body;

    if (!title?.trim() || !ingredients?.length || !steps?.length) {
      return NextResponse.json(
        { error: "title, ingredients, and steps are required" },
        { status: 400 },
      );
    }

    const db = getDb();
    // Add random suffix to avoid slug collisions on repeat imports
    const baseSlug = slugify(title);
    const suffix = crypto.randomUUID().slice(0, 6);
    const slug = `${baseSlug}-${suffix}`;

    // ─── Insert Recipe ───────────────────────────────
    const [recipe] = await db
      .insert(schema.recipes)
      .values({
        slug,
        title,
        description: description ?? null,
        cuisine: cuisine ?? "International",
        cookingTime: cookingTime ?? 0,
        prepTime: prepTime ?? 0,
        difficulty: difficulty ?? "Medium",
        servings: servings ?? 4,
        calories: calories ?? null,
        tags: tags ?? [],
        sourceUrl: "ai-generated",
        ownerId: DEV_USER,
        isUserRecipe: false,
        isPublished: true,
      })
      .returning({ id: schema.recipes.id, slug: schema.recipes.slug });

    // ─── Insert Ingredients ──────────────────────────
    if (ingredients.length > 0) {
      await db.insert(schema.recipeIngredients).values(
        ingredients.map((ing, idx) => ({
          recipeId: recipe.id,
          name: ing.name,
          amount: String(ing.amount),
          unit: ing.unit,
          category: ing.category ?? "other",
          sortOrder: idx,
        })),
      );
    }

    // ─── Insert Steps ────────────────────────────────
    if (steps.length > 0) {
      await db.insert(schema.recipeSteps).values(
        steps.map((step) => ({
          recipeId: recipe.id,
          stepNumber: step.number,
          instruction: step.instruction,
          duration: step.duration ?? null,
          tip: step.tip ?? null,
        })),
      );
    }

    return NextResponse.json({ id: recipe.id, slug: recipe.slug, title });
  } catch (error) {
    console.error("[POST /api/recipes/import]", error);
    return NextResponse.json(
      { error: "Failed to import recipe" },
      { status: 500 },
    );
  }
}
