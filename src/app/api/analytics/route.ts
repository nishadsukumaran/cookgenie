import { NextResponse } from "next/server";
import {
  getAllFeedbackAggregations,
  getScenarioMetrics,
} from "@/lib/engines/learning";

/**
 * Dev-only analytics endpoint.
 * GET: Returns feedback aggregation, scenario metrics, and AI performance stats.
 * POST: Accepts diagnostic events (e.g., import attempts) for debugging.
 */
export async function GET() {
  try {
    const [feedbackAggs, scenarioMetrics] = await Promise.all([
      getAllFeedbackAggregations(),
      getScenarioMetrics(),
    ]);

    // AI latency from scenario metrics
    const aiLatencies = scenarioMetrics
      .filter((m) => m.avgAiLatency > 0)
      .map((m) => m.avgAiLatency);
    const avgLatency = aiLatencies.length > 0
      ? Math.round(aiLatencies.reduce((a, b) => a + b, 0) / aiLatencies.length)
      : 0;

    return NextResponse.json({
      feedback: feedbackAggs,
      scenarios: scenarioMetrics,
      performance: {
        avgAiLatencyMs: avgLatency,
        totalScenarios: scenarioMetrics.length,
        totalFeedback: feedbackAggs.reduce((sum, a) => sum + a.totalCount, 0),
      },
    });
  } catch (err) {
    return NextResponse.json({
      feedback: [],
      scenarios: [],
      performance: { avgAiLatencyMs: 0, totalScenarios: 0, totalFeedback: 0 },
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

/**
 * Accept diagnostic events for debugging.
 * Currently logs to console in dev; can be extended to persist to DB.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Log the event for debugging purposes
    console.log("[analytics] Diagnostic event received:", JSON.stringify(body, null, 2));
    // TODO: Persist to ai_interactions table or dedicated analytics table
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[analytics] Failed to process POST request:", err);
    return NextResponse.json({ error: "Failed to process event" }, { status: 500 });
  }
}
