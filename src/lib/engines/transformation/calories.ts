/**
 * Calorie adjustment engine for CookGenie.
 *
 * Supports proportional scaling and smart calorie reduction
 * strategies that minimize impact on taste/authenticity.
 */

import type {
  Ingredient,
  CalorieAdjustment,
  CalorieModification,
  CalorieStrategy,
} from "../types";
import { roundKitchen } from "./units";

// ─── Calorie Data ───────────────────────────────────

/** Approximate calories per 100g for common ingredient categories */
const CALORIE_DENSITY: Record<string, number> = {
  // Fats & oils (high calorie density)
  butter: 717,
  ghee: 900,
  oil: 884,
  "olive oil": 884,
  "vegetable oil": 884,
  "coconut oil": 862,

  // Dairy
  "heavy cream": 340,
  cream: 340,
  "sour cream": 198,
  "greek yogurt": 59,
  yogurt: 61,
  "coconut cream": 230,
  cheese: 402,
  "feta cheese": 264,
  paneer: 265,
  milk: 42,

  // Proteins
  "chicken breast": 165,
  "chicken thighs": 209,
  chicken: 209,
  lamb: 294,
  beef: 250,
  eggs: 155,
  tofu: 76,

  // Carbs
  "basmati rice": 350,
  rice: 130,
  sugar: 387,
  honey: 304,
  flour: 364,

  // Nuts & seeds
  cashews: 553,
  almonds: 579,
  peanuts: 567,

  // Vegetables (low calorie)
  onion: 40,
  tomato: 18,
  "bell pepper": 31,
  cucumber: 16,
  avocado: 160,
};

/** Ingredients that are calorie-reduction targets (high impact, often reducible) */
const REDUCIBLE_INGREDIENTS: Record<string, { maxReduction: number; note: string }> = {
  butter: { maxReduction: 0.5, note: "Reduce by up to 50% — may lose richness" },
  ghee: { maxReduction: 0.5, note: "Reduce by up to 50% — may lose nutty aroma" },
  "heavy cream": { maxReduction: 0.6, note: "Swap to cashew paste or reduce — affects creaminess" },
  cream: { maxReduction: 0.6, note: "Swap to yogurt or reduce — affects creaminess" },
  oil: { maxReduction: 0.4, note: "Reduce carefully — needed for cooking" },
  "olive oil": { maxReduction: 0.4, note: "Reduce carefully — needed for cooking" },
  sugar: { maxReduction: 0.5, note: "Reduce by up to 50% — affects sweetness and texture" },
  "coconut cream": { maxReduction: 0.5, note: "Swap to lite coconut milk" },
  cheese: { maxReduction: 0.4, note: "Reduce portion — affects flavor significantly" },
};

// ─── Public API ─────────────────────────────────────

/**
 * Estimate total calories for a recipe based on ingredients and servings.
 */
export function estimateCalories(
  ingredients: Ingredient[],
  servings: number
): number {
  let total = 0;

  for (const ing of ingredients) {
    const density = findCalorieDensity(ing.name);
    if (density === null) continue;

    const grams = estimateGrams(ing.amount, ing.unit);
    total += (grams / 100) * density;
  }

  return Math.round(total / servings);
}

/**
 * Calculate calorie adjustment plan to reach a target.
 */
export function planCalorieReduction(
  ingredients: Ingredient[],
  servings: number,
  targetCaloriesPerServing: number,
  strategy: CalorieStrategy = "smart-swap"
): CalorieAdjustment {
  const currentCalories = estimateCalories(ingredients, servings);
  const totalCurrentCalories = currentCalories * servings;
  const totalTargetCalories = targetCaloriesPerServing * servings;
  const caloriesToCut = totalCurrentCalories - totalTargetCalories;

  if (caloriesToCut <= 0) {
    return {
      targetCalories: targetCaloriesPerServing,
      originalCalories: currentCalories,
      reductionPercent: 0,
      strategy,
      modifications: [],
    };
  }

  const modifications: CalorieModification[] = [];
  let remaining = caloriesToCut;

  if (strategy === "proportional") {
    // Simple: reduce everything proportionally
    const ratio = totalTargetCalories / totalCurrentCalories;
    for (const ing of ingredients) {
      const density = findCalorieDensity(ing.name);
      if (density === null) continue;

      const grams = estimateGrams(ing.amount, ing.unit);
      const ingCalories = (grams / 100) * density;
      const saved = ingCalories * (1 - ratio);

      if (saved > 5) {
        modifications.push({
          ingredient: ing.name,
          action: "reduce",
          originalAmount: ing.amount,
          newAmount: roundKitchen(ing.amount * ratio),
          unit: ing.unit,
          caloriesSaved: Math.round(saved / servings),
          note: `Reduced proportionally to ${Math.round(ratio * 100)}%`,
        });
      }
    }
  } else {
    // Smart: target high-calorie reducible ingredients first
    const candidates = ingredients
      .map((ing) => {
        const reducible = findReducible(ing.name);
        const density = findCalorieDensity(ing.name);
        if (!reducible || !density) return null;

        const grams = estimateGrams(ing.amount, ing.unit);
        const maxSaveable = (grams / 100) * density * reducible.maxReduction;

        return { ingredient: ing, density, maxSaveable, ...reducible };
      })
      .filter(Boolean)
      .sort((a, b) => b!.maxSaveable - a!.maxSaveable) as Array<{
        ingredient: Ingredient;
        density: number;
        maxSaveable: number;
        maxReduction: number;
        note: string;
      }>;

    for (const candidate of candidates) {
      if (remaining <= 0) break;

      const grams = estimateGrams(candidate.ingredient.amount, candidate.ingredient.unit);
      const currentCals = (grams / 100) * candidate.density;
      const reductionNeeded = Math.min(remaining / currentCals, candidate.maxReduction);
      const saved = currentCals * reductionNeeded;
      const newAmount = roundKitchen(candidate.ingredient.amount * (1 - reductionNeeded));

      modifications.push({
        ingredient: candidate.ingredient.name,
        action: "reduce",
        originalAmount: candidate.ingredient.amount,
        newAmount,
        unit: candidate.ingredient.unit,
        caloriesSaved: Math.round(saved / servings),
        note: candidate.note,
      });

      remaining -= saved;
    }
  }

  const actualReduction = caloriesToCut - Math.max(0, remaining);
  const newCalories = currentCalories - Math.round(actualReduction / servings);

  return {
    targetCalories: targetCaloriesPerServing,
    originalCalories: currentCalories,
    reductionPercent: Math.round((actualReduction / totalCurrentCalories) * 100),
    strategy,
    modifications,
  };
}

// ─── Internal Helpers ───────────────────────────────

function findCalorieDensity(name: string): number | null {
  const lower = name.toLowerCase();

  // Direct match
  if (lower in CALORIE_DENSITY) return CALORIE_DENSITY[lower];

  // Partial match
  for (const [key, value] of Object.entries(CALORIE_DENSITY)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }

  return null;
}

function findReducible(name: string): { maxReduction: number; note: string } | null {
  const lower = name.toLowerCase();

  if (lower in REDUCIBLE_INGREDIENTS) return REDUCIBLE_INGREDIENTS[lower];

  for (const [key, value] of Object.entries(REDUCIBLE_INGREDIENTS)) {
    if (lower.includes(key)) return value;
  }

  return null;
}

/**
 * Rough estimate of grams from amount + unit.
 * Used only for calorie estimation — not a precise conversion.
 */
function estimateGrams(amount: number, unit: string): number {
  const u = unit.toLowerCase().trim();
  const approx: Record<string, number> = {
    g: 1,
    kg: 1000,
    ml: 1, // rough: water density
    l: 1000,
    cup: 240,
    tbsp: 15,
    tsp: 5,
    oz: 28,
    lb: 454,
    large: 60, // rough: one large egg, one large onion
    medium: 40,
    small: 25,
    cloves: 5,
    pieces: 30,
    inch: 10,
    handful: 15,
    pinch: 1,
    "to taste": 2,
    set: 10,
  };

  return amount * (approx[u] || 30); // default 30g per "unit"
}
