import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import type { Ingredient, CookingStep } from "@/lib/engines/types";

const DEV_USER = "dev-user";
const VALID_CATEGORIES = ["protein", "dairy", "spice", "vegetable", "grain", "oil", "other"] as const;

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

    const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"];
    const safeDifficulty = VALID_DIFFICULTIES.includes(difficulty ?? "")
      ? difficulty!
      : "Medium";

    // ─── Coerce & Validate Ingredients ────────────────
    // AI may return amounts/durations as strings — coerce before validating
    const safeIngredients = ingredients
      .filter((ing: Ingredient) => ing.name?.trim()) // drop nameless
      .map((ing: Ingredient) => {
        // Normalize category to valid enum value
        const rawCategory = String(ing.category || "other").toLowerCase().trim();
        const category = VALID_CATEGORIES.includes(rawCategory as any) ? rawCategory : "other";
        
        return {
          ...ing,
          name: String(ing.name).trim(),
          amount: Number(ing.amount) || 1,
          unit: String(ing.unit || "piece"),
          category,
        };
      });

    // Deduplicate by name (AI sometimes lists the same ingredient twice)
    const seenNames = new Set<string>();
    const dedupedIngredients = safeIngredients.filter((ing) => {
      const key = ing.name.toLowerCase();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    if (dedupedIngredients.length === 0) {
      return NextResponse.json({ error: "At least one valid ingredient is required" }, { status: 400 });
    }
    if (dedupedIngredients.length > 30) {
      return NextResponse.json({ error: "Too many ingredients (max 30)" }, { status: 400 });
    }

    // ─── Coerce & Validate Steps ──────────────────────
    const safeSteps = steps
      .filter((step: CookingStep) => step.instruction?.trim())
      .map((step: CookingStep, idx: number) => ({
        ...step,
        number: idx + 1, // force sequential numbering to prevent duplicates
        instruction: String(step.instruction).trim(),
        duration: step.duration != null ? (Number(step.duration) || null) : null,
        tip: step.tip ? String(step.tip) : null,
      }));

    if (safeSteps.length === 0) {
      return NextResponse.json({ error: "At least one valid step is required" }, { status: 400 });
    }
    if (safeSteps.length > 20) {
      return NextResponse.json({ error: "Too many steps (max 20)" }, { status: 400 });
    }

    // ─── Time & Calorie Validation ────────────────────
    const safeCookingTime = (typeof cookingTime === "number" && cookingTime > 0 && cookingTime <= 1440) ? cookingTime : 30;
    const safePrepTime = (typeof prepTime === "number" && prepTime >= 0 && prepTime <= 1440) ? prepTime : 15;
    const safeCalories = (typeof calories === "number" && calories >= 0 && calories <= 5000) ? calories : null;

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
        cookingTime: safeCookingTime,
        prepTime: safePrepTime,
        difficulty: safeDifficulty,
        servings: servings ?? 4,
        calories: safeCalories,
        tags: tags ?? [],
        sourceUrl: "ai-generated",
        ownerId: DEV_USER,
        isUserRecipe: false,
        isPublished: true,
      })
      .returning({ id: schema.recipes.id, slug: schema.recipes.slug });

    // ─── Insert Ingredients ──────────────────────────
    if (dedupedIngredients.length > 0) {
      await db.insert(schema.recipeIngredients).values(
        dedupedIngredients.map((ing, idx) => ({
          recipeId: recipe.id,
          name: ing.name,
          amount: String(ing.amount),
          unit: ing.unit,
          category: ing.category,
          sortOrder: idx,
        })),
      );
    }

    // ─── Insert Steps ────────────────────────────────
    if (safeSteps.length > 0) {
      await db.insert(schema.recipeSteps).values(
        safeSteps.map((step) => ({
          recipeId: recipe.id,
          stepNumber: step.number,
          instruction: step.instruction,
          duration: step.duration,
          tip: step.tip,
        })),
      );
    }

    return NextResponse.json({ id: recipe.id, slug: recipe.slug, title });
  } catch (error) {
    // Log full error details for debugging
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      code: error instanceof Error && "code" in error ? (error as any).code : undefined,
      detail: error instanceof Error && "detail" in error ? (error as any).detail : undefined,
    };
    console.error("[POST /api/recipes/import] Database error:", JSON.stringify(errorDetails, null, 2));
    return NextResponse.json(
      { error: "Failed to import recipe", details: errorDetails.message },
      { status: 500 },
    );
  }
}
