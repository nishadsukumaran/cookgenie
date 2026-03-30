/**
 * CookGenie Project Tracker — Development-only local config.
 *
 * Update this file manually as you build. No database needed.
 * This is the single source of truth for build progress during dev.
 */

export type FeatureStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "needs_testing"
  | "complete"
  | "needs_refinement";

export type TestStatus = "not_tested" | "passing" | "failing" | "skipped";

export interface PhaseEntry {
  id: string;
  name: string;
  status: FeatureStatus;
  features: FeatureEntry[];
}

export interface FeatureEntry {
  name: string;
  status: FeatureStatus;
  notes?: string;
}

export interface TestScenario {
  id: string;
  name: string;
  category: "rescue" | "substitution" | "transformation" | "integration";
  status: TestStatus;
  notes?: string;
}

export interface BlockerEntry {
  id: string;
  description: string;
  severity: "low" | "medium" | "high";
  relatedFeature?: string;
}

// ═══════════════════════════════════════════
// ROADMAP
// ═══════════════════════════════════════════

export const phases: PhaseEntry[] = [
  {
    id: "phase-1",
    name: "Phase 1 — UI Foundation",
    status: "complete",
    features: [
      { name: "App shell & layout", status: "complete" },
      { name: "Design system (fonts, colors, tokens)", status: "complete" },
      { name: "Bottom navigation", status: "complete" },
      { name: "Home screen", status: "complete" },
      { name: "Search / Discovery screen", status: "complete" },
      { name: "Recipe Detail screen", status: "complete" },
      { name: "Guided Cook Mode", status: "complete" },
      { name: "Ask CookGenie chat", status: "complete" },
      { name: "Saved / Profile screens", status: "complete" },
      { name: "Mock data (6 recipes)", status: "complete" },
      { name: "14 reusable components", status: "complete" },
    ],
  },
  {
    id: "phase-2",
    name: "Phase 2 — Intelligence Architecture",
    status: "complete",
    features: [
      { name: "Transformation engine (scaling, units, calories)", status: "complete" },
      { name: "Substitution engine (DB + analyzer)", status: "complete" },
      { name: "Rescue engine (8 problems)", status: "complete" },
      { name: "Hybrid controller (intent → engines → AI)", status: "complete" },
      { name: "Intent detection (20+ patterns)", status: "complete" },
      { name: "AI task prompts (4 types)", status: "complete" },
      { name: "Multi-model arbitration pipeline", status: "complete", notes: "Built, not wired into API routes yet" },
      { name: "Knowledge guardrail", status: "complete" },
      { name: "HybridResponseCard UI", status: "complete" },
      { name: "RecipeDiscoveryCard UI", status: "complete" },
    ],
  },
  {
    id: "phase-3",
    name: "Phase 3 — Neon Data Layer",
    status: "complete",
    features: [
      { name: "Drizzle ORM schema (8 tables)", status: "complete" },
      { name: "Neon connection setup", status: "complete" },
      { name: "Seed script (recipes + substitutions)", status: "complete" },
      { name: "DB query helpers", status: "complete" },
      { name: "Typed JSONB for rescue_queries", status: "complete" },
    ],
  },
  {
    id: "phase-4",
    name: "Phase 4 — AI Integration",
    status: "in_progress",
    features: [
      { name: "AI service layer (task-based, mock fallback)", status: "complete" },
      { name: "POST /api/ask (rescue + substitution + general)", status: "complete" },
      { name: "POST /api/substitution", status: "complete" },
      { name: "POST /api/session", status: "complete" },
      { name: "Ask page → API wiring", status: "complete" },
      { name: "SubstitutionSheet (recipe detail)", status: "complete" },
      { name: "Debug trace panel", status: "complete" },
      { name: "Project tracker", status: "complete" },
      { name: "Rescue mock responses (all 8 problems)", status: "complete" },
      { name: "Substitution mock responses (butter, yogurt, cream)", status: "complete" },
      { name: "Butter chicken transformation tests (18 assertions)", status: "complete" },
      { name: "E2E API test suite (13 tests)", status: "complete" },
      { name: "Transformation engine hardening (sub-linear spices, rounding floor, liquid warning)", status: "complete" },
      { name: "Connect to real AI Gateway", status: "complete", notes: "Live: anthropic/claude-sonnet-4.6 via OIDC" },
      { name: "Real AI rescue flows (6/8 verified)", status: "complete", notes: "salt, spicy, watery, thick, bland, burned — all with trace fields" },
      { name: "Enhanced trace: structured_fix_used, ai_allowed_to_change_primary_fix=false", status: "complete" },
      { name: "Rescue flow verification script", status: "complete", notes: "scripts/verify-rescue-flows.ts — 5 scenarios" },
      { name: "Real AI substitution flows (6 verified)", status: "complete", notes: "cream, butter, yogurt, paneer, feta, saffron — all with trace fields" },
      { name: "Enhanced substitution trace: structured_substitution_used, ai_allowed_to_change=false", status: "complete" },
      { name: "Context-aware substitution prompts (recipe, cuisine, category, impact scores)", status: "complete" },
      { name: "Substitution verification script", status: "complete", notes: "scripts/verify-substitution-flows.ts — 6 scenarios" },
      { name: "Modification intelligence (calorie reduction, healthier)", status: "complete", notes: "POST /api/modify + /api/ask intent, real AI, trace verified" },
      { name: "Modification verification script", status: "complete", notes: "scripts/verify-modification-flows.ts — 28 assertions" },
      { name: "Trust layer (confidence, risk, authenticity meter, before/after, quick actions)", status: "complete" },
      { name: "Persistence layer (recipe_variants, user_feedback, user_preferences)", status: "complete", notes: "3 new tables + 3 new API routes + 2 new UI components" },
      { name: "Learning layer (feedback aggregation, confidence adjustment, personalization)", status: "complete" },
      { name: "Dev analytics panel (feedback rates, scenario metrics, AI latency)", status: "complete" },
      { name: "Multi-model arbitration in API routes", status: "not_started" },
    ],
  },
  {
    id: "phase-5",
    name: "Phase 5 — Auth & Production",
    status: "not_started",
    features: [
      { name: "Auth (Clerk / Auth0)", status: "not_started" },
      { name: "User-scoped data", status: "not_started" },
      { name: "Analytics / observability", status: "not_started" },
      { name: "Vercel deployment", status: "not_started" },
      { name: "Performance optimization", status: "not_started" },
    ],
  },
];

// ═══════════════════════════════════════════
// TEST SCENARIOS
// ═══════════════════════════════════════════

export const testScenarios: TestScenario[] = [
  // Rescue
  { id: "t-salt", name: "Too much salt", category: "rescue", status: "passing", notes: "Real AI: claude-sonnet-4.6, 8.3s, structured+AI hybrid" },
  { id: "t-spicy", name: "Too spicy", category: "rescue", status: "passing", notes: "Real AI: claude-sonnet-4.6, 7.1s, trace verified" },
  { id: "t-watery", name: "Too watery / thin", category: "rescue", status: "passing", notes: "Real AI: claude-sonnet-4.6, 6.8s, trace verified" },
  { id: "t-thick", name: "Too thick", category: "rescue", status: "passing", notes: "Real AI: claude-sonnet-4.6, 6.1s, trace verified" },
  { id: "t-sweet", name: "Too sweet", category: "rescue", status: "passing", notes: "Real AI via E2E test, structured match confirmed" },
  { id: "t-bland", name: "Bland / no flavor", category: "rescue", status: "passing", notes: "Real AI: claude-sonnet-4.6, 6.6s, trace verified" },
  { id: "t-burned", name: "Slightly burned", category: "rescue", status: "passing", notes: "Real AI: claude-sonnet-4.6, 6.5s, trace verified" },
  { id: "t-missing", name: "Missing ingredient", category: "rescue", status: "passing", notes: "Structured match, directs to substitution engine" },

  // Substitution
  { id: "t-no-cream", name: "Heavy cream → cashew paste", category: "substitution", status: "passing", notes: "Real AI: 7.1s, score 80%, trace verified" },
  { id: "t-butter-ghee", name: "Butter → ghee", category: "substitution", status: "passing", notes: "Real AI: 6.5s, score 100%, trace verified" },
  { id: "t-yogurt-greek", name: "Yogurt → Greek yogurt", category: "substitution", status: "passing", notes: "Real AI: 6.6s, score 100%, trace verified" },
  { id: "t-paneer-tofu", name: "Paneer → tofu", category: "substitution", status: "passing", notes: "Real AI: 6.5s, score 53%, trace verified" },
  { id: "t-feta-goat", name: "Feta → goat cheese (shakshuka)", category: "substitution", status: "passing", notes: "Real AI: 7.8s, score 75%, trace verified" },
  { id: "t-saffron", name: "Saffron → turmeric+cardamom (biryani)", category: "substitution", status: "passing", notes: "Real AI: 7.4s, score 63%, trace verified" },

  // Transformation
  { id: "t-scale-up", name: "Scale 4→8 servings", category: "transformation", status: "passing", notes: "18/18 assertions. Chicken doubles, sugar sub-linear" },
  { id: "t-scale-down", name: "Scale 4→2 servings", category: "transformation", status: "passing", notes: "All amounts halve, all > 0" },
  { id: "t-scale-extreme", name: "Scale 4→20 (extreme)", category: "transformation", status: "passing", notes: "Caution + critical warnings generated" },
  { id: "t-calorie", name: "Calorie estimation", category: "transformation", status: "passing", notes: "785 cal/serving estimate (reasonable for butter chicken)" },
  { id: "t-unit-conv", name: "Unit conversion", category: "transformation", status: "passing", notes: "cup→ml, g→oz, roundKitchen, incompatible→null" },

  // Integration
  { id: "t-cook-mode", name: "Cook mode step navigation", category: "integration", status: "passing" },
  { id: "t-session-persist", name: "Cooking session persistence", category: "integration", status: "not_tested", notes: "Needs DB connection to test" },
  { id: "t-trace-panel", name: "Debug trace panel renders", category: "integration", status: "passing" },
  { id: "t-tracker", name: "Project tracker panel", category: "integration", status: "passing" },
];

// ═══════════════════════════════════════════
// BLOCKERS & NOTES
// ═══════════════════════════════════════════

export const blockers: BlockerEntry[] = [
  // All blockers resolved as of 2026-03-30
  // AI Gateway live, Neon live, all flows real
];

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

export function getPhaseProgress(phase: PhaseEntry): number {
  if (phase.features.length === 0) return 0;
  const done = phase.features.filter((f) => f.status === "complete").length;
  return Math.round((done / phase.features.length) * 100);
}

export function getOverallProgress(): number {
  const all = phases.flatMap((p) => p.features);
  const done = all.filter((f) => f.status === "complete").length;
  return Math.round((done / all.length) * 100);
}

export function getTestSummary(): { total: number; passing: number; failing: number; untested: number } {
  return {
    total: testScenarios.length,
    passing: testScenarios.filter((t) => t.status === "passing").length,
    failing: testScenarios.filter((t) => t.status === "failing").length,
    untested: testScenarios.filter((t) => t.status === "not_tested").length,
  };
}
