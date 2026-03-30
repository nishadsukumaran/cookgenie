/**
 * Ingredient scaling engine for CookGenie.
 *
 * Handles serving-based scaling with kitchen-friendly rounding
 * and smart handling of non-linear ingredients (spices, leaveners).
 */

import type { Ingredient, TransformationWarning } from "../types";
import { roundKitchen, isDescriptiveUnit } from "./units";

// ─── Scaling Behavior ───────────────────────────────

/**
 * Ingredients that don't scale linearly.
 * At 2x servings, these scale at ~1.5x (not 2x).
 * At 0.5x servings, these scale at ~0.7x (not 0.5x).
 */
const SUB_LINEAR_INGREDIENTS = new Set([
  "salt",
  "pepper",
  "sugar",
  "baking powder",
  "baking soda",
  "yeast",
  "vanilla extract",
  "soy sauce",
  "fish sauce",
  "worcestershire sauce",
  "garam masala",
  "turmeric",
  "red chili powder",
  "cumin powder",
]);

/**
 * Ingredients that should not be scaled at all.
 */
const NON_SCALABLE_UNITS = new Set([
  "to taste",
  "as needed",
  "for garnish",
  "optional",
]);

// ─── Public API ─────────────────────────────────────

export interface ScaleResult {
  ingredients: Ingredient[];
  warnings: TransformationWarning[];
}

/**
 * Scale ingredients from one serving size to another.
 *
 * Uses linear scaling for most ingredients, sub-linear scaling
 * for seasonings and leaveners, and skips non-scalable items.
 */
export function scaleIngredients(
  ingredients: Ingredient[],
  originalServings: number,
  targetServings: number
): ScaleResult {
  if (originalServings <= 0 || targetServings <= 0) {
    return { ingredients, warnings: [{ severity: "critical", message: "Servings must be greater than 0" }] };
  }

  const ratio = targetServings / originalServings;
  const warnings: TransformationWarning[] = [];

  // Extreme scaling warnings
  if (ratio > 4) {
    warnings.push({
      severity: "caution",
      message: `Scaling up ${ratio.toFixed(1)}x may affect cooking times and heat distribution. Consider cooking in batches.`,
    });
  }
  if (ratio < 0.25) {
    warnings.push({
      severity: "caution",
      message: "Very small batches can be hard to cook evenly. Some amounts may be impractically small.",
    });
  }

  const scaled = ingredients.map((ingredient) => {
    // Non-scalable ingredients
    if (NON_SCALABLE_UNITS.has(ingredient.unit.toLowerCase())) {
      return { ...ingredient };
    }

    // Descriptive units that represent whole items (cloves, pieces, etc.)
    if (isDescriptiveUnit(ingredient.unit)) {
      const scaledAmount = Math.max(1, Math.round(ingredient.amount * ratio));
      return { ...ingredient, amount: scaledAmount };
    }

    // Sub-linear scaling for seasonings
    if (isSubLinear(ingredient.name)) {
      const adjustedRatio = subLinearRatio(ratio);
      const newAmount = roundKitchen(ingredient.amount * adjustedRatio);

      if (ratio >= 2) {
        warnings.push({
          severity: "info",
          ingredient: ingredient.name,
          message: `${ingredient.name} scaled conservatively (${adjustedRatio.toFixed(1)}x instead of ${ratio.toFixed(1)}x). Taste and adjust.`,
        });
      }

      return { ...ingredient, amount: newAmount };
    }

    // Linear scaling for everything else
    return {
      ...ingredient,
      amount: roundKitchen(ingredient.amount * ratio),
    };
  });

  return { ingredients: scaled, warnings };
}

/**
 * Calculate the scaling ratio between two serving counts.
 */
export function getScaleRatio(
  originalServings: number,
  targetServings: number
): number {
  if (originalServings <= 0) return 1;
  return targetServings / originalServings;
}

// ─── Internal Helpers ───────────────────────────────

function isSubLinear(ingredientName: string): boolean {
  const name = ingredientName.toLowerCase();
  return SUB_LINEAR_INGREDIENTS.has(name) ||
    name.includes("powder") ||
    name.includes("extract") ||
    name.includes("sauce") && name !== "tomato sauce";
}

/**
 * Sub-linear scaling curve.
 * At 2x: returns ~1.5x
 * At 3x: returns ~2x
 * At 0.5x: returns ~0.7x
 *
 * Uses square root blending: result = ratio^0.7
 */
function subLinearRatio(linearRatio: number): number {
  if (linearRatio === 1) return 1;
  return Math.pow(linearRatio, 0.7);
}
