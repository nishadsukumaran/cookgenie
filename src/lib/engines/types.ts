/**
 * Shared types for CookGenie engines.
 *
 * All engines consume and produce these types. UI components
 * should import from here, not from individual engine files.
 */

// ─── Ingredient & Recipe ────────────────────────────

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  category: "protein" | "dairy" | "spice" | "vegetable" | "grain" | "oil" | "other";
}

export interface CookingStep {
  number: number;
  instruction: string;
  duration?: number;
  tip?: string;
}

// ─── Transformation Engine ──────────────────────────

export interface TransformationResult {
  ingredients: Ingredient[];
  calories: number;
  servings: number;
  warnings: TransformationWarning[];
  changes: TransformationChange[];
}

export interface TransformationWarning {
  severity: "info" | "caution" | "critical";
  message: string;
  ingredient?: string;
}

export interface TransformationChange {
  ingredient: string;
  field: "amount" | "unit";
  from: string | number;
  to: string | number;
  reason: string;
}

export type UnitSystem = "metric" | "imperial";

export interface UnitConversion {
  from: string;
  to: string;
  factor: number;
}

export interface CalorieAdjustment {
  targetCalories: number;
  originalCalories: number;
  reductionPercent: number;
  strategy: CalorieStrategy;
  modifications: CalorieModification[];
}

export type CalorieStrategy = "proportional" | "smart-swap" | "reduce-fat" | "reduce-carb";

export interface CalorieModification {
  ingredient: string;
  action: "reduce" | "swap" | "remove";
  originalAmount: number;
  newAmount: number;
  unit: string;
  caloriesSaved: number;
  note: string;
}

// ─── Modification Response ──────────────────────────

export type ModificationType = "reduce-calories" | "reduce-spice" | "healthier" | "reduce-fat" | "reduce-carb";

export interface ModificationResponse {
  modificationType: ModificationType;
  recipeName: string;
  originalCalories: number;
  newCalories: number;
  reductionPercent: number;
  primaryChanges: CalorieModification[];
  ingredientAdjustments: Array<{
    ingredient: string;
    from: string;
    to: string;
    reason: string;
  }>;
  expectedTasteChange: ImpactLevel;
  expectedTextureChange: ImpactLevel;
  authenticityImpact: ImpactLevel;
  calorieImpact: string;
  warnings: string[];
  explanation: string;
  confidence: "high" | "medium" | "low";
}

export interface ImpactLevel {
  level: "none" | "minor" | "moderate" | "significant";
  description: string;
}

// ─── Substitution Engine ────────────────────────────

export interface SubstitutionEntry {
  original: string;
  substitutes: SubstituteOption[];
}

export interface SubstituteOption {
  name: string;
  tier: "best" | "fallback";
  quantityMapping: QuantityMapping;
  impact: SubstitutionImpact;
}

export interface QuantityMapping {
  ratio: number; // e.g., 0.75 means use 75% of original amount
  unit?: string; // override unit if different
  note?: string; // e.g., "soak in water first"
}

export interface SubstitutionImpact {
  taste: ImpactRating;
  texture: ImpactRating;
  authenticity: ImpactRating;
  summary: string;
}

export interface ImpactRating {
  score: number; // 1-5 where 5 = identical to original
  description: string;
}

// ─── Rescue Engine ──────────────────────────────────

export type RescueProblem =
  | "too-salty"
  | "too-spicy"
  | "too-sweet"
  | "too-watery"
  | "too-thick"
  | "bland"
  | "slightly-burned"
  | "missing-ingredient";

export interface RescueSolution {
  problem: RescueProblem;
  label: string;
  icon: string;
  severity: "mild" | "moderate" | "severe";
  immediateFix: RescueStep;
  gradualFix: RescueStep;
  preventionTip: string;
  affectedDishes?: string[]; // cuisines or dish types this applies to
}

export interface RescueStep {
  instruction: string;
  ingredients?: { name: string; amount: string }[];
  duration?: string;
}

// ─── AI Service Layer ───────────────────────────────

export type AiTaskType =
  | "recipe-reasoning"
  | "substitution-analysis"
  | "rescue-advice"
  | "authenticity-analysis";

export interface AiTaskRequest {
  type: AiTaskType;
  context: Record<string, unknown>;
}

export interface AiTaskResponse {
  content: string;
  structured?: Record<string, unknown>;
  model?: string;
  cached?: boolean;
}
