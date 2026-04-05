import { NextResponse } from "next/server";
import {
  createCookingSession,
  updateSessionStep,
  completeSession,
} from "@/lib/db/queries";
import { getUserId } from "@/lib/auth/session";

interface SessionRequest {
  action: "start" | "step" | "complete";
  recipeId?: string;
  servings?: number;
  totalSteps?: number;
  sessionId?: string;
  step?: number;
  transformations?: Record<string, unknown>;
}

export async function POST(req: Request) {
  const userId = await getUserId();
  // If not logged in, use anonymous user
  const effectiveUserId = userId ?? "anonymous";

  const body: SessionRequest = await req.json();

  switch (body.action) {
    case "start": {
      if (!body.recipeId || !body.totalSteps || !body.servings) {
        return NextResponse.json(
          { error: "recipeId, totalSteps, and servings are required" },
          { status: 400 }
        );
      }
      const sessionId = await createCookingSession({
        userId: effectiveUserId,
        recipeId: body.recipeId,
        totalSteps: body.totalSteps,
        servingsUsed: body.servings,
        transformations: body.transformations,
      });
      return NextResponse.json({ sessionId });
    }

    case "step": {
      if (!body.sessionId || body.step == null) {
        return NextResponse.json(
          { error: "sessionId and step are required" },
          { status: 400 }
        );
      }
      await updateSessionStep(body.sessionId, body.step);
      return NextResponse.json({ ok: true });
    }

    case "complete": {
      if (!body.sessionId) {
        return NextResponse.json(
          { error: "sessionId is required" },
          { status: 400 }
        );
      }
      await completeSession(body.sessionId);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
