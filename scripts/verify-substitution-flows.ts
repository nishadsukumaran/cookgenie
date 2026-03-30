/**
 * Verify substitution flows produce correct structured + AI responses
 * with proper trace fields and DB logging.
 *
 * Run: TEST_BASE_URL=http://localhost:3000 npx tsx scripts/verify-substitution-flows.ts
 */

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

interface TestCase {
  name: string;
  ingredient: string;
  recipeName?: string;
  cuisine?: string;
  expectedBest: string;
  expectedFallback?: string;
  expectedMinScore: number;
}

const cases: TestCase[] = [
  {
    name: "cream → cashew paste (butter chicken)",
    ingredient: "heavy cream",
    recipeName: "Butter Chicken",
    cuisine: "Indian",
    expectedBest: "Cashew paste",
    expectedFallback: "Coconut cream",
    expectedMinScore: 60,
  },
  {
    name: "butter → ghee",
    ingredient: "butter",
    recipeName: "Butter Chicken",
    cuisine: "Indian",
    expectedBest: "Ghee",
    expectedFallback: "Olive oil",
    expectedMinScore: 80,
  },
  {
    name: "yogurt → Greek yogurt",
    ingredient: "yogurt",
    recipeName: "Chicken Biryani",
    cuisine: "Indian",
    expectedBest: "Greek yogurt",
    expectedFallback: "Sour cream",
    expectedMinScore: 80,
  },
  {
    name: "paneer → tofu",
    ingredient: "paneer",
    recipeName: "Paneer Butter Masala",
    cuisine: "Indian",
    expectedBest: "Extra-firm tofu",
    expectedMinScore: 40,
  },
  {
    name: "feta cheese → goat cheese (shakshuka)",
    ingredient: "feta cheese",
    recipeName: "Shakshuka",
    cuisine: "Middle Eastern",
    expectedBest: "Goat cheese",
    expectedMinScore: 60,
  },
  {
    name: "saffron → turmeric+cardamom (biryani)",
    ingredient: "saffron",
    recipeName: "Chicken Biryani",
    cuisine: "Indian",
    expectedBest: "Turmeric + cardamom",
    expectedMinScore: 40,
  },
];

let passed = 0;
let failed = 0;

async function verify(tc: TestCase) {
  const res = await fetch(`${BASE}/api/substitution`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ingredient: tc.ingredient,
      recipeName: tc.recipeName,
      cuisine: tc.cuisine,
    }),
  });

  if (!res.ok) {
    console.log(`  [FAIL] ${tc.name}: HTTP ${res.status}`);
    failed++;
    return;
  }

  const data = await res.json();
  const errors: string[] = [];

  // Must find a match
  if (!data.found) {
    errors.push(`found=false for "${tc.ingredient}"`);
  }

  // Best substitute name
  if (data.best?.name !== tc.expectedBest) {
    errors.push(`best.name="${data.best?.name}" expected "${tc.expectedBest}"`);
  }

  // Fallback (if expected)
  if (tc.expectedFallback && data.fallback?.name !== tc.expectedFallback) {
    errors.push(`fallback.name="${data.fallback?.name}" expected "${tc.expectedFallback}"`);
  }

  // Score check
  if (data.best && data.best.score < tc.expectedMinScore) {
    errors.push(`best.score=${data.best.score} below minimum ${tc.expectedMinScore}`);
  }

  // AI explanation should exist and be non-trivial
  if (!data.aiExplanation || data.aiExplanation.length < 50) {
    errors.push(`aiExplanation too short (${data.aiExplanation?.length || 0} chars)`);
  }

  // Impact scores should exist on best
  if (data.best) {
    for (const dim of ["taste", "texture", "authenticity"] as const) {
      if (!data.best.impact?.[dim]?.score) {
        errors.push(`best.impact.${dim}.score missing`);
      }
    }
  }

  // Trace fields (dev only)
  const trace = data._trace;
  if (trace) {
    const knowledgeStage = trace.stages?.find((s: { name: string }) => s.name === "knowledge");
    if (knowledgeStage) {
      if (knowledgeStage.details.structured_substitution_used !== true) {
        errors.push("trace: structured_substitution_used should be true");
      }
    }

    const aiStage = trace.stages?.find((s: { name: string }) => s.name === "ai-enrichment");
    if (aiStage) {
      if (aiStage.details.ai_enrichment_used !== true) {
        errors.push("trace: ai_enrichment_used should be true");
      }
      if (aiStage.details.ai_allowed_to_change_primary_substitute !== false) {
        errors.push("trace: ai_allowed_to_change_primary_substitute should be false");
      }
      if (aiStage.details.wasMock === true) {
        errors.push("trace: wasMock should be false (real AI expected)");
      }
    }
  }

  if (errors.length === 0) {
    const model = trace?.stages?.find((s: { name: string }) => s.name === "ai-enrichment")?.details?.model || "unknown";
    const latency = trace?.stages?.find((s: { name: string }) => s.name === "ai-enrichment")?.details?.latencyMs || "?";
    console.log(`  [PASS] ${tc.name} — ${model}, ${latency}ms, score: ${data.best?.score}%, AI: ${data.aiExplanation?.length} chars`);
    passed++;
  } else {
    console.log(`  [FAIL] ${tc.name}:`);
    errors.forEach((e) => console.log(`         ${e}`));
    failed++;
  }
}

async function main() {
  console.log("==============================================");
  console.log("  CookGenie Substitution Flow Verification");
  console.log(`  Target: ${BASE}`);
  console.log("==============================================\n");

  try {
    const probe = await fetch(`${BASE}/api/substitution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredient: "test" }),
    });
    if (!probe.ok && probe.status !== 200) throw new Error(`HTTP ${probe.status}`);
  } catch (e) {
    console.error(`ERROR: Cannot reach ${BASE}/api/substitution`);
    process.exit(1);
  }

  for (const tc of cases) {
    await verify(tc);
  }

  console.log("\n==============================================");
  console.log(`  Passed: ${passed}/${cases.length}  Failed: ${failed}/${cases.length}`);
  console.log("==============================================");

  process.exit(failed > 0 ? 1 : 0);
}

main();
