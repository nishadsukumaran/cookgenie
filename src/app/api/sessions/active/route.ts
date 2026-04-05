import { NextResponse } from "next/server";
import { getActiveSessions } from "@/lib/db/queries";
import { getRecipeById } from "@/data/mock-data";
import { getUserId } from "@/lib/auth/session";

export interface ActiveSessionResponse {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeCuisine: string;
  currentStep: number;
  totalSteps: number;
  servingsUsed: number;
  startedAt: string;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ sessions: [] });
    }

    const sessions = await getActiveSessions(userId);

    const enriched: ActiveSessionResponse[] = sessions.map((s) => {
      // Resolve recipe slug from UUID — check mock data first
      // In production this would join with the recipes table
      const recipe = getRecipeById(s.recipeId) ??
        { title: "Unknown Recipe", cuisine: "Unknown", id: s.recipeId };

      return {
        id: s.id,
        recipeId: s.recipeId,
        recipeName: recipe.title,
        recipeCuisine: recipe.cuisine,
        currentStep: s.currentStep ?? 1,
        totalSteps: s.totalSteps,
        servingsUsed: s.servingsUsed,
        startedAt: s.startedAt?.toISOString() ?? new Date().toISOString(),
      };
    });

    return NextResponse.json({ sessions: enriched });
  } catch {
    // DB unavailable — return empty (graceful degradation)
    return NextResponse.json({ sessions: [] });
  }
}
