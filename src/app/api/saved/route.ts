import { NextResponse } from "next/server";
import { saveRecipe, unsaveRecipe, getSavedRecipes } from "@/lib/db/queries";

const DEV_USER = "dev-user";

export async function POST(req: Request) {
  const body: { recipeId?: string; action?: "save" | "unsave" } =
    await req.json();

  if (!body.recipeId || !body.action) {
    return NextResponse.json(
      { error: "recipeId and action are required" },
      { status: 400 }
    );
  }

  if (body.action === "save") {
    await saveRecipe(DEV_USER, body.recipeId);
  } else if (body.action === "unsave") {
    await unsaveRecipe(DEV_USER, body.recipeId);
  } else {
    return NextResponse.json(
      { error: 'action must be "save" or "unsave"' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const rows = await getSavedRecipes(DEV_USER);

  const savedRecipeIds = rows.map((r) => r.recipeId);

  const savedRecipes = rows.map((r) => ({
    id: r.slug,
    title: r.title,
    description: r.description ?? "",
    image: r.imageUrl || `/images/${r.slug}.jpg`,
    cuisine: r.cuisine,
    cookingTime: r.cookingTime,
    prepTime: r.prepTime,
    difficulty: r.difficulty,
    rating: r.rating ? parseFloat(r.rating) : 0,
    servings: r.servings,
    calories: r.calories ?? 0,
    tags: r.tags ?? [],
    aiSummary: r.aiSummary ?? "",
    ingredients: [],
    steps: [],
    substitutions: [],
  }));

  return NextResponse.json({ savedRecipeIds, savedRecipes });
}
