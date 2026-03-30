/**
 * Unit conversion system for CookGenie.
 *
 * Handles metric ↔ imperial, volume ↔ volume, and provides
 * human-friendly rounding for kitchen quantities.
 */

import type { UnitSystem } from "../types";

// ─── Conversion Tables ─────────────────────────────

/** Volume conversions to milliliters (base unit) */
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.929,
  tbsp: 14.787,
  cup: 236.588,
  "fl oz": 29.574,
  pint: 473.176,
  quart: 946.353,
  gallon: 3785.41,
};

/** Weight conversions to grams (base unit) */
const WEIGHT_TO_G: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

/** Temperature conversions */
const TEMP_UNITS = new Set(["°C", "°F", "C", "F"]);

/** Units that should not be converted (descriptive quantities) */
const NON_CONVERTIBLE = new Set([
  "pinch",
  "to taste",
  "cloves",
  "pieces",
  "large",
  "medium",
  "small",
  "bunch",
  "handful",
  "sprig",
  "set",
  "inch",
  "slice",
  "head",
  "stalk",
]);

// ─── Public API ─────────────────────────────────────

export function isConvertibleUnit(unit: string): boolean {
  const normalized = normalizeUnit(unit);
  return (
    normalized in VOLUME_TO_ML ||
    normalized in WEIGHT_TO_G ||
    TEMP_UNITS.has(normalized)
  );
}

export function isVolumeUnit(unit: string): boolean {
  return normalizeUnit(unit) in VOLUME_TO_ML;
}

export function isWeightUnit(unit: string): boolean {
  return normalizeUnit(unit) in WEIGHT_TO_G;
}

export function isDescriptiveUnit(unit: string): boolean {
  return NON_CONVERTIBLE.has(unit.toLowerCase().trim());
}

/**
 * Convert a value between compatible units.
 * Returns null if conversion is not possible.
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (from === to) return value;

  // Volume ↔ Volume
  if (from in VOLUME_TO_ML && to in VOLUME_TO_ML) {
    const ml = value * VOLUME_TO_ML[from];
    return ml / VOLUME_TO_ML[to];
  }

  // Weight ↔ Weight
  if (from in WEIGHT_TO_G && to in WEIGHT_TO_G) {
    const g = value * WEIGHT_TO_G[from];
    return g / WEIGHT_TO_G[to];
  }

  // Temperature
  if (TEMP_UNITS.has(from) && TEMP_UNITS.has(to)) {
    return convertTemperature(value, from, to);
  }

  return null; // Incompatible units (can't convert weight to volume without density)
}

/**
 * Convert all ingredients to a target unit system (metric or imperial).
 */
export function convertToSystem(
  amount: number,
  unit: string,
  target: UnitSystem
): { amount: number; unit: string } {
  const normalized = normalizeUnit(unit);

  if (isDescriptiveUnit(unit)) {
    return { amount, unit };
  }

  if (target === "metric") {
    // Imperial volume → metric
    if (["cup", "fl oz", "pint", "quart", "gallon", "tsp", "tbsp"].includes(normalized)) {
      const ml = amount * (VOLUME_TO_ML[normalized] || 1);
      if (ml >= 1000) return { amount: roundKitchen(ml / 1000), unit: "l" };
      return { amount: roundKitchen(ml), unit: "ml" };
    }
    // Imperial weight → metric
    if (["oz", "lb"].includes(normalized)) {
      const g = amount * (WEIGHT_TO_G[normalized] || 1);
      if (g >= 1000) return { amount: roundKitchen(g / 1000), unit: "kg" };
      return { amount: roundKitchen(g), unit: "g" };
    }
  }

  if (target === "imperial") {
    // Metric volume → imperial
    if (normalized === "ml" || normalized === "l") {
      const ml = normalized === "l" ? amount * 1000 : amount;
      if (ml >= 236) return { amount: roundKitchen(ml / 236.588), unit: "cup" };
      if (ml >= 15) return { amount: roundKitchen(ml / 14.787), unit: "tbsp" };
      return { amount: roundKitchen(ml / 4.929), unit: "tsp" };
    }
    // Metric weight → imperial
    if (normalized === "g" || normalized === "kg") {
      const g = normalized === "kg" ? amount * 1000 : amount;
      if (g >= 453) return { amount: roundKitchen(g / 453.592), unit: "lb" };
      return { amount: roundKitchen(g / 28.3495), unit: "oz" };
    }
  }

  return { amount, unit }; // Already in target system or unconvertible
}

/**
 * Round a number to kitchen-friendly precision.
 * - Whole numbers stay whole: 400 → 400
 * - Small fractions round to nearest quarter: 0.33 → 0.25
 * - Medium values round to 1 decimal: 2.7 → 2.5 (nearest 0.5)
 */
export function roundKitchen(value: number): number {
  if (value === 0) return 0;

  // Very small amounts: round to 2 decimals, with a minimum useful kitchen amount
  if (value < 1) {
    const quarters = Math.round(value * 4) / 4;
    const result = quarters || Math.round(value * 100) / 100;
    // Prevent rounding to zero for non-zero inputs (minimum useful kitchen amount)
    return result || 0.125;
  }

  // Small amounts (1-10): round to nearest 0.25
  if (value < 10) {
    return Math.round(value * 4) / 4;
  }

  // Medium amounts (10-100): round to nearest 5
  if (value < 100) {
    return Math.round(value / 5) * 5;
  }

  // Large amounts: round to nearest 10
  return Math.round(value / 10) * 10;
}

// ─── Internal Helpers ───────────────────────────────

function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase().trim();
  const aliases: Record<string, string> = {
    teaspoon: "tsp",
    teaspoons: "tsp",
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    cups: "cup",
    ounce: "oz",
    ounces: "oz",
    pound: "lb",
    pounds: "lb",
    gram: "g",
    grams: "g",
    kilogram: "kg",
    kilograms: "kg",
    liter: "l",
    liters: "l",
    litre: "l",
    litres: "l",
    milliliter: "ml",
    milliliters: "ml",
    millilitre: "ml",
    millilitres: "ml",
    "fluid ounce": "fl oz",
    "fluid ounces": "fl oz",
    celsius: "°C",
    fahrenheit: "°F",
  };
  return aliases[u] || u;
}

function convertTemperature(value: number, from: string, to: string): number {
  const isFromC = from === "°C" || from === "C";
  const isToC = to === "°C" || to === "C";

  if (isFromC && !isToC) return (value * 9) / 5 + 32; // C → F
  if (!isFromC && isToC) return ((value - 32) * 5) / 9; // F → C
  return value;
}
