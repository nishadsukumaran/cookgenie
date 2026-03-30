/**
 * CookGenie API Integration Tests
 *
 * Runs real HTTP calls against the local dev server.
 *
 * PREREQUISITE: The dev server must be running on http://localhost:3000
 *   Start it with:  npm run dev   (or pnpm dev / yarn dev)
 *
 * Run this script with:
 *   npx tsx scripts/test-api.ts
 */

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

// ─── Helpers ───────────────────────────────────────────

interface TestResult {
  number: number;
  description: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function record(number: number, description: string, passed: boolean, detail: string) {
  results.push({ number, description, passed, detail });
  const icon = passed ? "PASS" : "FAIL";
  console.log(`  [${icon}] #${number} ${description}`);
  if (!passed) {
    console.log(`         ${detail}`);
  }
}

async function askApi(message: string): Promise<any> {
  const res = await fetch(`${BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    throw new Error(`/api/ask returned ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function substitutionApi(ingredient: string): Promise<any> {
  const res = await fetch(`${BASE}/api/substitution`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredient }),
  });
  if (!res.ok) {
    throw new Error(`/api/substitution returned ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ─── Rescue Flow Tests (POST /api/ask) ─────────────────

async function testRescueFlows() {
  console.log("\n--- Rescue Flows (POST /api/ask) ---\n");

  // #1 — Too much salt
  {
    const data = await askApi("I added too much salt");
    const typeOk = data.type === "rescue";
    const titleOk = typeof data.fix?.title === "string" && data.fix.title.includes("Salty");
    const sourceOk = data.source?.structured === true;
    const passed = typeOk && titleOk && sourceOk;
    record(
      1,
      '"I added too much salt" -> type=rescue, fix.title contains "Salty", source.structured=true',
      passed,
      `type=${data.type}, fix.title="${data.fix?.title}", source.structured=${data.source?.structured}`,
    );
  }

  // #2 — Too spicy
  {
    const data = await askApi("This curry is way too spicy");
    const typeOk = data.type === "rescue";
    const titleOk = typeof data.fix?.title === "string" && data.fix.title.includes("Spicy");
    const passed = typeOk && titleOk;
    record(
      2,
      '"This curry is way too spicy" -> type=rescue, matches too-spicy',
      passed,
      `type=${data.type}, fix.title="${data.fix?.title}"`,
    );
  }

  // #3 — Too watery
  {
    const data = await askApi("My sauce is too watery");
    const typeOk = data.type === "rescue";
    const titleOk = typeof data.fix?.title === "string" && data.fix.title.includes("Watery");
    const passed = typeOk && titleOk;
    record(
      3,
      '"My sauce is too watery" -> type=rescue, matches too-watery',
      passed,
      `type=${data.type}, fix.title="${data.fix?.title}"`,
    );
  }

  // #4 — Too thick
  {
    const data = await askApi("The gravy is too thick");
    const typeOk = data.type === "rescue";
    const titleOk = typeof data.fix?.title === "string" && data.fix.title.includes("Thick");
    const passed = typeOk && titleOk;
    record(
      4,
      '"The gravy is too thick" -> type=rescue, matches too-thick',
      passed,
      `type=${data.type}, fix.title="${data.fix?.title}"`,
    );
  }

  // #5 — Bland
  {
    const data = await askApi("This dish is really bland");
    const typeOk = data.type === "rescue";
    const titleOk = typeof data.fix?.title === "string" && data.fix.title.includes("Bland");
    const passed = typeOk && titleOk;
    record(
      5,
      '"This dish is really bland" -> type=rescue, matches bland',
      passed,
      `type=${data.type}, fix.title="${data.fix?.title}"`,
    );
  }

  // #6 — Slightly burned
  {
    const data = await askApi("I think I burned the bottom");
    const typeOk = data.type === "rescue";
    const titleOk = typeof data.fix?.title === "string" && data.fix.title.includes("Burned");
    const passed = typeOk && titleOk;
    record(
      6,
      '"I think I burned the bottom" -> type=rescue, matches slightly-burned',
      passed,
      `type=${data.type}, fix.title="${data.fix?.title}"`,
    );
  }

  // #7 — Too sweet
  {
    const data = await askApi("Too much sugar in the sauce");
    const typeOk = data.type === "rescue";
    const titleOk = typeof data.fix?.title === "string" && data.fix.title.includes("Sweet");
    const passed = typeOk && titleOk;
    record(
      7,
      '"Too much sugar in the sauce" -> type=rescue, matches too-sweet',
      passed,
      `type=${data.type}, fix.title="${data.fix?.title}"`,
    );
  }
}

// ─── Substitution Flow Tests (POST /api/substitution) ──

async function testSubstitutionFlows() {
  console.log("\n--- Substitution Flows (POST /api/substitution) ---\n");

  // #8 — Heavy cream
  {
    const data = await substitutionApi("heavy cream");
    const foundOk = data.found === true;
    const bestOk = data.best?.name === "Cashew paste";
    const passed = foundOk && bestOk;
    record(
      8,
      '{ ingredient: "heavy cream" } -> found=true, best.name="Cashew paste"',
      passed,
      `found=${data.found}, best.name="${data.best?.name}"`,
    );
  }

  // #9 — Butter
  {
    const data = await substitutionApi("butter");
    const foundOk = data.found === true;
    const bestOk = data.best?.name === "Ghee";
    const passed = foundOk && bestOk;
    record(
      9,
      '{ ingredient: "butter" } -> found=true, best.name="Ghee"',
      passed,
      `found=${data.found}, best.name="${data.best?.name}"`,
    );
  }

  // #10 — Yogurt
  {
    const data = await substitutionApi("yogurt");
    const foundOk = data.found === true;
    const bestOk = data.best?.name === "Greek yogurt";
    const passed = foundOk && bestOk;
    record(
      10,
      '{ ingredient: "yogurt" } -> found=true, best.name="Greek yogurt"',
      passed,
      `found=${data.found}, best.name="${data.best?.name}"`,
    );
  }

  // #11 — Paneer
  {
    const data = await substitutionApi("paneer");
    const foundOk = data.found === true;
    const bestOk = data.best?.name === "Extra-firm tofu";
    const passed = foundOk && bestOk;
    record(
      11,
      '{ ingredient: "paneer" } -> found=true, best.name="Extra-firm tofu"',
      passed,
      `found=${data.found}, best.name="${data.best?.name}"`,
    );
  }

  // #12 — Unknown ingredient
  {
    const data = await substitutionApi("unknown_ingredient_xyz");
    const foundOk = data.found === false;
    const passed = foundOk;
    record(
      12,
      '{ ingredient: "unknown_ingredient_xyz" } -> found=false',
      passed,
      `found=${data.found}`,
    );
  }
}

// ─── General Flow Tests (POST /api/ask) ────────────────

async function testGeneralFlows() {
  console.log("\n--- General Flow (POST /api/ask) ---\n");

  // #13 — General question
  {
    const data = await askApi("What temperature should I bake bread at?");
    const typeOk = data.type === "general";
    const passed = typeOk;
    record(
      13,
      '"What temperature should I bake bread at?" -> type=general',
      passed,
      `type=${data.type}`,
    );
  }
}

// ─── Main ──────────────────────────────────────────────

async function main() {
  console.log("==============================================");
  console.log("  CookGenie API Test Suite");
  console.log("  Target: http://localhost:3000");
  console.log("==============================================");

  // Quick connectivity check
  try {
    const probe = await fetch(`${BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "ping" }),
    });
    if (!probe.ok && probe.status !== 400) {
      throw new Error(`Unexpected status ${probe.status}`);
    }
  } catch (err: any) {
    console.error("\nERROR: Cannot reach the dev server at http://localhost:3000");
    console.error("Make sure the server is running (npm run dev) and try again.\n");
    console.error(`  ${err.message}\n`);
    process.exit(1);
  }

  try {
    await testRescueFlows();
    await testSubstitutionFlows();
    await testGeneralFlows();
  } catch (err: any) {
    console.error(`\nFATAL ERROR during test execution: ${err.message}\n`);
    process.exit(1);
  }

  // ─── Summary ─────────────────────────────────────────
  console.log("\n==============================================");
  console.log("  Summary");
  console.log("==============================================\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`  Total:  ${total}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  if (failed > 0) {
    console.log("\n  Failed tests:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`    #${r.number} ${r.description}`);
      console.log(`           ${r.detail}`);
    }
    console.log("");
    process.exit(1);
  }

  console.log("\n  All tests passed!\n");
  process.exit(0);
}

main();
