import { NextResponse } from "next/server";
import { getCompletedSessions, getCookingStats } from "@/lib/db/queries";
import { getRecipeById } from "@/data/mock-data";
import { getUserId } from "@/lib/auth/session";

export interface HistorySession {
  id: string;
  recipeId: string;
  recipeTitle: string;
  servingsUsed: number;
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
}

export interface CookingStatsResponse {
  totalCompleted: number;
  totalCookingMinutes: number;
  mostCookedRecipe: { recipeId: string; title: string; count: number } | null;
}

export interface HistoryResponse {
  sessions: HistorySession[];
  stats: CookingStatsResponse;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({
        sessions: [],
        stats: { totalCompleted: 0, totalCookingMinutes: 0, mostCookedRecipe: null },
      });
    }

    const [sessions, stats] = await Promise.all([
      getCompletedSessions(userId),
      getCookingStats(userId),
    ]);

    // Enrich sessions with recipe titles and computed duration
    const enriched: HistorySession[] = sessions.map((s) => {
      const recipe = getRecipeById(s.recipeId) ?? {
        title: "Unknown Recipe",
        id: s.recipeId,
      };

      const startMs = s.startedAt?.getTime() ?? 0;
      const endMs = s.completedAt?.getTime() ?? 0;
      const durationMinutes =
        startMs && endMs ? Math.round((endMs - startMs) / 60_000) : 0;

      return {
        id: s.id,
        recipeId: s.recipeId,
        recipeTitle: recipe.title,
        servingsUsed: s.servingsUsed,
        startedAt: s.startedAt?.toISOString() ?? new Date().toISOString(),
        completedAt: s.completedAt?.toISOString() ?? new Date().toISOString(),
        durationMinutes,
      };
    });

    // Compute most-cooked recipe from enriched sessions
    const recipeCounts = new Map<string, { title: string; count: number }>();
    for (const s of enriched) {
      const entry = recipeCounts.get(s.recipeId);
      if (entry) {
        entry.count += 1;
      } else {
        recipeCounts.set(s.recipeId, { title: s.recipeTitle, count: 1 });
      }
    }

    let mostCookedRecipe: CookingStatsResponse["mostCookedRecipe"] = null;
    let maxCount = 0;
    for (const [recipeId, { title, count }] of recipeCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCookedRecipe = { recipeId, title, count };
      }
    }

    const response: HistoryResponse = {
      sessions: enriched,
      stats: {
        totalCompleted: stats.totalCompleted,
        totalCookingMinutes: stats.totalMinutes,
        mostCookedRecipe,
      },
    };

    return NextResponse.json(response);
  } catch {
    // DB unavailable — return empty (graceful degradation)
    return NextResponse.json({
      sessions: [],
      stats: { totalCompleted: 0, totalCookingMinutes: 0, mostCookedRecipe: null },
    });
  }
}
