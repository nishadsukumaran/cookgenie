/**
 * Verify modification flows (calorie reduction, healthier, reduce-spice)
 * through both /api/modify (direct) and /api/ask (chat intent).
 *
 * Run: TEST_BASE_URL=http://localhost:3000 npx tsx scripts/verify-modification-flows.ts
 */

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string, detail?: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.log(`         FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  console.log("==============================================");
  console.log("  CookGenie Modification Flow Verification");
  console.log(`  Target: ${BASE}`);
  console.log("==============================================\n");

  // ─── Test 1: /api/modify — reduce calories 20% for butter chicken ───
  console.log("  [Test 1] POST /api/modify — 20% calorie reduction for Butter Chicken");
  {
    const res = await fetch(`${BASE}/api/modify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeId: "butter-chicken",
        modificationType: "reduce-calories",
        targetReductionPercent: 20,
      }),
    });
    const data = await res.json();

    check(res.ok, "HTTP 200");
    check(data.modificationType === "reduce-calories", "modificationType is reduce-calories", data.modificationType);
    check(data.recipeName === "Butter Chicken", "recipeName is Butter Chicken", data.recipeName);
    check(data.originalCalories > 300, "originalCalories > 300", String(data.originalCalories));
    check(data.newCalories < data.originalCalories, "newCalories < original", `${data.newCalories} < ${data.originalCalories}`);
    check(data.reductionPercent > 0, "reductionPercent > 0", String(data.reductionPercent));
    check(Array.isArray(data.primaryChanges) && data.primaryChanges.length > 0, "has primaryChanges");
    check(data.expectedTasteChange?.level !== undefined, "has expectedTasteChange.level");
    check(data.expectedTextureChange?.level !== undefined, "has expectedTextureChange.level");
    check(data.authenticityImpact?.level !== undefined, "has authenticityImpact.level");
    check(typeof data.explanation === "string" && data.explanation.length > 50, "explanation is non-trivial", `${data.explanation?.length} chars`);
    check(data.confidence === "high" || data.confidence === "medium", "confidence is high or medium");
    check(Array.isArray(data.warnings), "has warnings array");

    // Trace fields
    const trace = data._trace;
    if (trace) {
      const engineStage = trace.stages?.find((s: { name: string }) => s.name === "engine");
      check(engineStage?.details?.structured_modification_used === true, "trace: structured_modification_used");

      const aiStage = trace.stages?.find((s: { name: string }) => s.name === "ai-enrichment");
      check(aiStage?.details?.ai_enrichment_used === true, "trace: ai_enrichment_used");
      check(aiStage?.details?.ai_allowed_to_change_primary_modification === false, "trace: ai_allowed_to_change=false");
      check(aiStage?.details?.wasMock === false, "trace: wasMock is false (real AI)");

      const model = aiStage?.details?.model || "unknown";
      const latency = aiStage?.details?.latencyMs || "?";
      console.log(`  → Model: ${model}, Latency: ${latency}ms, Reduction: ${data.reductionPercent}%`);
    }
    console.log(`  → ${data.primaryChanges?.length} ingredient changes, ${data.explanation?.length} char explanation`);
  }

  console.log("");

  // ─── Test 2: /api/ask — "reduce calories by 20%" via chat intent ───
  console.log("  [Test 2] POST /api/ask — 'Reduce calories by 20% for my butter chicken'");
  {
    const res = await fetch(`${BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Reduce calories by 20% for my butter chicken",
        context: { recipeId: "butter-chicken", recipeName: "Butter Chicken", cuisine: "Indian" },
      }),
    });
    const data = await res.json();

    check(res.ok, "HTTP 200");
    check(data.type === "explanation", "type is explanation (modification)", data.type);
    check(data.fix?.title?.includes("Calorie Reduction"), "fix.title contains Calorie Reduction", data.fix?.title);
    check(data.source?.structured === true, "source.structured is true");
    check(data.source?.ai === true, "source.ai is true");
    check(typeof data.explanation === "string" && data.explanation.length > 50, "explanation is non-trivial");

    const trace = data._trace;
    if (trace) {
      const intentStage = trace.stages?.find((s: { name: string }) => s.name === "intent");
      check(intentStage?.details?.category === "modification", "intent.category is modification", intentStage?.details?.category);

      const engineStage = trace.stages?.find((s: { name: string }) => s.name === "engine");
      check(engineStage?.details?.structured_modification_used === true, "trace: structured_modification_used");
    }
    console.log(`  → Intent detected, engine + AI used, ${data.explanation?.length} char explanation`);
  }

  console.log("");

  // ─── Test 3: /api/ask — "make this healthier" via chat intent ───
  console.log("  [Test 3] POST /api/ask — 'Make this healthier but keep the signature'");
  {
    const res = await fetch(`${BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Make this healthier but keep the signature",
        context: { recipeId: "butter-chicken", recipeName: "Butter Chicken", cuisine: "Indian" },
      }),
    });
    const data = await res.json();

    check(res.ok, "HTTP 200");
    // Should detect as modification/healthier
    check(data.source?.structured === true || data.source?.ai === true, "has structured or AI source");
    check(typeof data.explanation === "string" && data.explanation.length > 30, "has explanation");
    console.log(`  → Type: ${data.type}, ${data.explanation?.length} char explanation`);
  }

  // ─── Summary ──────────────────────────────────────
  console.log("\n==============================================");
  console.log(`  Passed: ${passed}  Failed: ${failed}`);
  console.log("==============================================");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
