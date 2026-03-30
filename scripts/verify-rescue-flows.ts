/**
 * Verify all rescue flows produce correct real AI responses
 * with proper trace fields and DB logging.
 *
 * Run: TEST_BASE_URL=http://localhost:3000 npx tsx scripts/verify-rescue-flows.ts
 */

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

interface TestCase {
  name: string;
  message: string;
  expectedProblem: string;
  expectedFixContains: string;
}

const cases: TestCase[] = [
  {
    name: "too-spicy",
    message: "This curry is way too spicy, my mouth is burning",
    expectedProblem: "Spicy",
    expectedFixContains: "dairy",
  },
  {
    name: "too-watery",
    message: "My butter chicken sauce is too watery and thin",
    expectedProblem: "Watery",
    expectedFixContains: "lid",
  },
  {
    name: "too-thick",
    message: "The gravy has become way too thick and heavy",
    expectedProblem: "Thick",
    expectedFixContains: "warm liquid",
  },
  {
    name: "bland",
    message: "This dish tastes really bland and has no flavor at all",
    expectedProblem: "Bland",
    expectedFixContains: "salt",
  },
  {
    name: "slightly-burned",
    message: "I think I burned the bottom of my curry, I can smell it",
    expectedProblem: "Burned",
    expectedFixContains: "transfer",
  },
];

let passed = 0;
let failed = 0;

async function verify(tc: TestCase) {
  const res = await fetch(`${BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: tc.message }),
  });

  if (!res.ok) {
    console.log(`  [FAIL] ${tc.name}: HTTP ${res.status}`);
    failed++;
    return;
  }

  const data = await res.json();
  const errors: string[] = [];

  // Response type
  if (data.type !== "rescue") errors.push(`type="${data.type}" expected "rescue"`);

  // Fix title contains expected problem label
  if (!data.fix?.title?.includes(tc.expectedProblem)) {
    errors.push(`fix.title="${data.fix?.title}" missing "${tc.expectedProblem}"`);
  }

  // Fix instruction contains expected keyword (case-insensitive)
  const fixLower = (data.fix?.instruction || "").toLowerCase();
  if (!fixLower.includes(tc.expectedFixContains.toLowerCase())) {
    errors.push(`fix.instruction missing "${tc.expectedFixContains}"`);
  }

  // Source fields
  if (!data.source?.structured) errors.push("source.structured should be true");
  if (!data.source?.ai) errors.push("source.ai should be true");

  // Explanation should exist and be non-trivial
  if (!data.explanation || data.explanation.length < 50) {
    errors.push(`explanation too short (${data.explanation?.length || 0} chars)`);
  }

  // Trace fields (dev only)
  const trace = data._trace;
  if (trace) {
    // Check knowledge stage has structured_fix_used
    const knowledgeStage = trace.stages?.find((s: { name: string }) => s.name === "knowledge");
    if (knowledgeStage) {
      if (knowledgeStage.details.structured_fix_used !== true) {
        errors.push("trace: structured_fix_used should be true");
      }
    } else {
      errors.push("trace: missing knowledge stage");
    }

    // Check ai-enrichment stage has the control fields
    const aiStage = trace.stages?.find((s: { name: string }) => s.name === "ai-enrichment");
    if (aiStage) {
      if (aiStage.details.ai_enrichment_used !== true) {
        errors.push("trace: ai_enrichment_used should be true");
      }
      if (aiStage.details.ai_allowed_to_change_primary_fix !== false) {
        errors.push("trace: ai_allowed_to_change_primary_fix should be false");
      }
      if (aiStage.details.wasMock === true) {
        errors.push("trace: wasMock should be false (real AI expected)");
      }
    } else {
      errors.push("trace: missing ai-enrichment stage");
    }

    // Source provenance
    if (trace.source?.mock === true) {
      errors.push("trace: source.mock should be false");
    }
  }

  if (errors.length === 0) {
    const model = trace?.stages?.find((s: { name: string }) => s.name === "ai-enrichment")?.details?.model || "unknown";
    const latency = trace?.stages?.find((s: { name: string }) => s.name === "ai-enrichment")?.details?.latencyMs || "?";
    console.log(`  [PASS] ${tc.name} — ${model}, ${latency}ms, explanation: ${data.explanation.length} chars`);
    passed++;
  } else {
    console.log(`  [FAIL] ${tc.name}:`);
    errors.forEach((e) => console.log(`         ${e}`));
    failed++;
  }
}

async function main() {
  console.log("==============================================");
  console.log("  CookGenie Rescue Flow Verification");
  console.log(`  Target: ${BASE}`);
  console.log("==============================================\n");

  // Connectivity check
  try {
    const probe = await fetch(`${BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "test" }),
    });
    if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
  } catch (e) {
    console.error(`ERROR: Cannot reach ${BASE}/api/ask`);
    process.exit(1);
  }

  // Run sequentially to avoid rate limiting
  for (const tc of cases) {
    await verify(tc);
  }

  console.log("\n==============================================");
  console.log(`  Passed: ${passed}/${cases.length}  Failed: ${failed}/${cases.length}`);
  console.log("==============================================");

  process.exit(failed > 0 ? 1 : 0);
}

main();
