/**
 * Cooking rescue knowledge base.
 *
 * Structured solutions for common cooking problems.
 * Each solution has immediate fix, gradual fix, and prevention tips.
 */

import type { RescueSolution, RescueProblem } from "../types";

export const RESCUE_DB: RescueSolution[] = [
  {
    problem: "too-salty",
    label: "Too Salty",
    icon: "🧂",
    severity: "moderate",
    immediateFix: {
      instruction:
        "Add acid to counteract the salt perception. Squeeze in fresh lemon juice or a splash of vinegar. Start with 1 tsp and taste.",
      ingredients: [
        { name: "Lemon juice", amount: "1-2 tsp" },
        { name: "or White vinegar", amount: "1 tsp" },
      ],
    },
    gradualFix: {
      instruction:
        "Add more unsalted bulk ingredients to dilute the salt. For curries, add more tomato puree or cream. For soups, add water or unsalted broth and additional vegetables. A peeled raw potato simmered for 10 minutes can absorb some salt.",
      ingredients: [
        { name: "Unsalted broth or water", amount: "1/2 cup" },
        { name: "Potato (peeled, whole)", amount: "1 medium" },
        { name: "or Heavy cream", amount: "2-3 tbsp" },
      ],
      duration: "10-15 minutes",
    },
    preventionTip:
      "Always add salt gradually and taste as you go. Season at the end rather than the beginning — flavors concentrate as liquid reduces.",
    affectedDishes: ["Indian", "Arabic", "Mediterranean"],
  },
  {
    problem: "too-spicy",
    label: "Too Spicy",
    icon: "🌶️",
    severity: "moderate",
    immediateFix: {
      instruction:
        "Add dairy — it contains casein which breaks down capsaicin (the heat molecule). Stir in yogurt, cream, or coconut milk. Sugar also counteracts heat perception.",
      ingredients: [
        { name: "Plain yogurt or cream", amount: "3-4 tbsp" },
        { name: "Sugar", amount: "1 tsp" },
      ],
    },
    gradualFix: {
      instruction:
        "Add more of the non-spicy base ingredients: tomatoes, onions, or coconut milk. This dilutes the heat while keeping the dish balanced. Double the gravy base if needed, then adjust other seasonings.",
      ingredients: [
        { name: "Tomato puree", amount: "1/2 cup" },
        { name: "or Coconut milk", amount: "1/2 cup" },
      ],
      duration: "10 minutes simmer",
    },
    preventionTip:
      "Add chili in stages. Start with half the recipe amount, taste after 5 minutes of cooking, then add more. Remember: heat builds over time in slow-cooked dishes.",
  },
  {
    problem: "too-sweet",
    label: "Too Sweet",
    icon: "🍯",
    severity: "mild",
    immediateFix: {
      instruction:
        "Add acid (lemon juice, vinegar) to balance sweetness. A pinch of salt also suppresses sweet perception. For savory dishes, add a splash of soy sauce or Worcestershire sauce.",
      ingredients: [
        { name: "Lemon juice", amount: "1-2 tsp" },
        { name: "Salt", amount: "small pinch" },
      ],
    },
    gradualFix: {
      instruction:
        "Add more of the savory/acidic base. For tomato sauces, add more crushed tomatoes. For curries, add more spice paste. The goal is to rebalance the overall flavor profile.",
      ingredients: [
        { name: "Crushed tomatoes", amount: "1/4 cup" },
        { name: "or Spice paste", amount: "1 tbsp" },
      ],
      duration: "5-10 minutes",
    },
    preventionTip:
      "Add sugar last and in small amounts. Many recipes overshoot — start with half the stated amount and adjust to taste.",
  },
  {
    problem: "too-watery",
    label: "Too Watery",
    icon: "💧",
    severity: "mild",
    immediateFix: {
      instruction:
        "Remove the lid and increase heat to medium-high. Let the liquid reduce through evaporation. Stir occasionally to prevent burning at the bottom.",
      duration: "10-15 minutes",
    },
    gradualFix: {
      instruction:
        "Make a slurry: mix 1 tbsp cornstarch with 2 tbsp cold water. Stir into the dish and cook for 2-3 minutes until thickened. For Indian curries, cashew paste or tomato paste work better than cornstarch.",
      ingredients: [
        { name: "Cornstarch", amount: "1 tbsp" },
        { name: "Cold water", amount: "2 tbsp" },
        { name: "or Cashew paste", amount: "2 tbsp" },
      ],
      duration: "3-5 minutes",
    },
    preventionTip:
      "Add liquids gradually. You can always add more, but removing excess is harder. For curries, cook the masala until oil separates before adding liquid.",
  },
  {
    problem: "too-thick",
    label: "Too Thick",
    icon: "🫗",
    severity: "mild",
    immediateFix: {
      instruction:
        "Add warm liquid (broth, water, or milk) a few tablespoons at a time. Stir well between additions. Use warm liquid — cold liquid can cause uneven texture.",
      ingredients: [
        { name: "Warm broth or water", amount: "2-4 tbsp at a time" },
      ],
    },
    gradualFix: {
      instruction:
        "For cream-based dishes, add warm milk or cream. For tomato-based, add a splash of tomato juice or broth. Simmer gently for 2-3 minutes after each addition to let flavors meld.",
      ingredients: [
        { name: "Warm milk or cream", amount: "1/4 cup" },
        { name: "or Broth", amount: "1/4 cup" },
      ],
      duration: "2-3 minutes per addition",
    },
    preventionTip:
      "Sauces thicken as they cool and as starch continues to absorb liquid. If it looks right hot, it will be thicker when served.",
  },
  {
    problem: "bland",
    label: "Bland / No Flavor",
    icon: "😐",
    severity: "moderate",
    immediateFix: {
      instruction:
        "The most common cause is under-seasoning. Add salt first (it amplifies all other flavors), then acid (lemon juice), then a pinch of sugar. Taste after each addition.",
      ingredients: [
        { name: "Salt", amount: "1/4 tsp at a time" },
        { name: "Lemon juice", amount: "1 tsp" },
        { name: "Sugar", amount: "1 pinch" },
      ],
    },
    gradualFix: {
      instruction:
        "Toast whole spices in a dry pan for 30 seconds to bloom their oils, then add to the dish. Finish with fresh herbs, a drizzle of good olive oil, or a squeeze of citrus. Umami boosters: soy sauce, fish sauce, or tomato paste.",
      ingredients: [
        { name: "Whole spices (cumin, coriander)", amount: "1 tsp" },
        { name: "Fresh herbs", amount: "1 handful" },
        { name: "or Soy sauce", amount: "1 tsp" },
      ],
      duration: "2-5 minutes",
    },
    preventionTip:
      "Taste throughout cooking, not just at the end. Season in layers. Make sure spices are fresh — stale spices have little flavor. Toast whole spices before grinding.",
  },
  {
    problem: "slightly-burned",
    label: "Slightly Burned",
    icon: "🔥",
    severity: "severe",
    immediateFix: {
      instruction:
        "Immediately transfer the unburned portion to a clean pot — do NOT scrape the bottom. The burned flavor migrates upward quickly. Taste the transferred portion.",
      duration: "1 minute (act fast!)",
    },
    gradualFix: {
      instruction:
        "If there's a slight smoky taste, mask it: add a splash of vinegar or lemon juice, extra seasoning, or a spoonful of peanut butter (for savory dishes). A raw peeled potato simmered for 10 minutes can absorb some of the burnt taste. For rice, place a slice of white bread on top.",
      ingredients: [
        { name: "Vinegar or lemon juice", amount: "1 tbsp" },
        { name: "or Peanut butter (savory dishes)", amount: "1 tsp" },
        { name: "or White bread slice (for rice)", amount: "1 piece" },
      ],
      duration: "10 minutes",
    },
    preventionTip:
      "Use heavy-bottomed pots for even heat distribution. Never leave the kitchen during high-heat steps. Stir regularly when cooking on medium or higher heat. Reduce heat if you see/smell any browning at the base.",
  },
  {
    problem: "missing-ingredient",
    label: "Missing an Ingredient",
    icon: "❓",
    severity: "mild",
    immediateFix: {
      instruction:
        "Check CookGenie's substitution engine for smart swaps. Many ingredients have excellent alternatives that preserve the dish's character. Tap the swap icon next to any ingredient.",
    },
    gradualFix: {
      instruction:
        "If no substitute is available, consider whether the ingredient is essential (core flavor/texture), important (enhances but not required), or optional (garnish/finishing). Essential: better to make a different dish. Important: reduce other bold flavors to compensate. Optional: skip it entirely.",
    },
    preventionTip:
      "Read the full ingredient list before starting. CookGenie highlights substitutable ingredients — check before you cook. Keep pantry staples stocked.",
  },
];

/**
 * Find a rescue solution for a specific problem.
 */
export function findRescueSolution(problem: RescueProblem): RescueSolution | null {
  return RESCUE_DB.find((s) => s.problem === problem) || null;
}

/**
 * Find rescue solutions relevant to a specific cuisine or dish type.
 */
export function findRescuesForCuisine(cuisine: string): RescueSolution[] {
  return RESCUE_DB.filter(
    (s) =>
      !s.affectedDishes || // Universal solutions
      s.affectedDishes.some((d) =>
        d.toLowerCase().includes(cuisine.toLowerCase())
      )
  );
}

/**
 * Get all rescue solutions.
 */
export function getAllRescues(): RescueSolution[] {
  return RESCUE_DB;
}
