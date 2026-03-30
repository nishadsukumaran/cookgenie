/**
 * Transformation warning system for CookGenie.
 *
 * Detects when recipe modifications may affect cooking outcome,
 * taste, texture, or authenticity. Pure deterministic logic.
 */

import type { Ingredient, TransformationWarning } from "../types";

// ─── Warning Rules ──────────────────────────────────

interface WarningRule {
  check: (ctx: WarningContext) => TransformationWarning | null;
}

interface WarningContext {
  originalIngredients: Ingredient[];
  modifiedIngredients: Ingredient[];
  originalServings: number;
  newServings: number;
  cuisine?: string;
}

const rules: WarningRule[] = [
  // Fat reduction impact
  {
    check(ctx) {
      const fatIngredients = ["butter", "ghee", "oil", "cream", "coconut oil"];
      const originalFat = sumAmounts(ctx.originalIngredients, fatIngredients);
      const modifiedFat = sumAmounts(ctx.modifiedIngredients, fatIngredients);

      if (originalFat > 0 && modifiedFat / originalFat < 0.5) {
        return {
          severity: "caution",
          message:
            "Fat reduced by more than 50%. This will affect richness, mouthfeel, and may change how spices bloom. Consider reducing gradually.",
        };
      }
      return null;
    },
  },

  // Sugar reduction in baking/desserts
  {
    check(ctx) {
      const originalSugar = sumByName(ctx.originalIngredients, "sugar");
      const modifiedSugar = sumByName(ctx.modifiedIngredients, "sugar");

      if (originalSugar > 0 && modifiedSugar / originalSugar < 0.6) {
        return {
          severity: "caution",
          message:
            "Sugar reduced significantly. In baked goods this affects texture, browning, and moisture retention — not just sweetness.",
        };
      }
      return null;
    },
  },

  // Dairy removal
  {
    check(ctx) {
      const dairyNames = ["cream", "yogurt", "milk", "butter", "ghee", "paneer", "cheese"];
      const originalDairy = sumAmounts(ctx.originalIngredients, dairyNames);
      const modifiedDairy = sumAmounts(ctx.modifiedIngredients, dairyNames);

      if (originalDairy > 0 && modifiedDairy === 0) {
        return {
          severity: "caution",
          message:
            "All dairy removed. The dish will taste noticeably different. Dairy contributes creaminess, tanginess, and helps mellow spices.",
        };
      }
      return null;
    },
  },

  // Extreme scaling
  {
    check(ctx) {
      const ratio = ctx.newServings / ctx.originalServings;

      if (ratio >= 5) {
        return {
          severity: "critical",
          message: `Scaling to ${ctx.newServings} servings (${ratio}x original). Cooking times, pan sizes, and liquid evaporation rates will need adjustment. Strongly recommend cooking in batches.`,
        };
      }
      return null;
    },
  },

  // Spice scaling caution
  {
    check(ctx) {
      const ratio = ctx.newServings / ctx.originalServings;
      if (ratio <= 1.5) return null;

      const spiceIngredients = ctx.originalIngredients.filter(
        (i) => i.category === "spice"
      );
      if (spiceIngredients.length >= 4) {
        return {
          severity: "info",
          message:
            "This recipe has many spices. When scaling up, add spices conservatively and taste as you go — spice intensity doesn't always scale linearly.",
        };
      }
      return null;
    },
  },

  // Protein quantity warning
  {
    check(ctx) {
      const proteins = ctx.modifiedIngredients.filter(
        (i) => i.category === "protein"
      );
      for (const protein of proteins) {
        if (protein.unit === "g" && protein.amount > 2000) {
          return {
            severity: "caution",
            ingredient: protein.name,
            message: `${protein.name} amount is ${protein.amount}g. This much protein may not cook evenly in one batch. Consider splitting across multiple pans.`,
          };
        }
      }
      return null;
    },
  },

  // Liquid reduction — dish may dry out
  {
    check(ctx) {
      const liquidIngredients = ["water", "broth", "stock", "coconut milk", "milk", "wine", "beer", "juice"];
      const originalLiquid = sumAmounts(ctx.originalIngredients, liquidIngredients);
      const modifiedLiquid = sumAmounts(ctx.modifiedIngredients, liquidIngredients);

      if (originalLiquid > 0 && modifiedLiquid / originalLiquid < 0.5) {
        return {
          severity: "caution",
          message:
            "Liquid ingredients reduced by more than 50%. The dish may dry out during cooking. Consider reducing cooking time or adding liquid gradually.",
        };
      }
      return null;
    },
  },

  // Missing key ingredient
  {
    check(ctx) {
      const removed = ctx.originalIngredients.filter(
        (orig) =>
          !ctx.modifiedIngredients.some(
            (mod) =>
              mod.name.toLowerCase() === orig.name.toLowerCase() &&
              mod.amount > 0
          )
      );

      for (const ing of removed) {
        if (ing.category === "protein") {
          return {
            severity: "critical",
            ingredient: ing.name,
            message: `${ing.name} was removed. This is a core ingredient — the dish will be fundamentally different without it.`,
          };
        }
      }
      return null;
    },
  },
];

// ─── Public API ─────────────────────────────────────

/**
 * Generate all applicable warnings for a transformation.
 */
export function generateWarnings(ctx: WarningContext): TransformationWarning[] {
  return rules
    .map((rule) => rule.check(ctx))
    .filter((w): w is TransformationWarning => w !== null);
}

// ─── Helpers ────────────────────────────────────────

function sumAmounts(ingredients: Ingredient[], namePatterns: string[]): number {
  return ingredients
    .filter((i) =>
      namePatterns.some((p) => i.name.toLowerCase().includes(p.toLowerCase()))
    )
    .reduce((sum, i) => sum + i.amount, 0);
}

function sumByName(ingredients: Ingredient[], name: string): number {
  return ingredients
    .filter((i) => i.name.toLowerCase().includes(name.toLowerCase()))
    .reduce((sum, i) => sum + i.amount, 0);
}
