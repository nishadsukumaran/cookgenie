import { NextResponse } from "next/server";
import { saveVariant, getUserVariants, getVariantsForRecipe } from "@/lib/db/queries";
import { getUserId } from "@/lib/auth/session";

interface SaveVariantRequest {
  baseRecipeId: string;
  name: string;
  servings: number;
  ingredientChanges: Array<{
    ingredient: string;
    originalAmount: number;
    newAmount: number;
    unit: string;
    reason: string;
  }>;
  trustMetrics: {
    confidence: { score: number; label: string };
    risk: { level: string; reasons: string[] };
    authenticity: { score: number; label: string };
    caloriesBefore: number;
    caloriesAfter: number;
  };
  changeSummary: string;
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: SaveVariantRequest = await req.json();

  if (!body.baseRecipeId || !body.name) {
    return NextResponse.json({ error: "baseRecipeId and name are required" }, { status: 400 });
  }

  const id = await saveVariant({
    userId,
    baseRecipeId: body.baseRecipeId,
    name: body.name,
    servings: body.servings,
    ingredientChanges: body.ingredientChanges,
    trustMetrics: body.trustMetrics,
    changeSummary: body.changeSummary,
  });

  return NextResponse.json({ id });
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ variants: [] });
  }

  const url = new URL(req.url);
  const recipeId = url.searchParams.get("recipeId");

  const variants = recipeId
    ? await getVariantsForRecipe(userId, recipeId)
    : await getUserVariants(userId);

  return NextResponse.json({ variants });
}
