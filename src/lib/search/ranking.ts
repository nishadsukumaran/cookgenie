/**
 * Recipe search ranking — weighted scoring for local search.
 *
 * Shared between SearchInput dropdown and search results page.
 * Pure function, no side effects.
 */

import type { Recipe } from "@/data/mock-data";

export interface ScoredRecipe {
  recipe: Recipe;
  score: number;
  matchType: "title" | "cuisine" | "tag" | "ingredient" | "description" | "none";
}

const WEIGHTS = {
  titleExact: 10,
  titlePartial: 6,
  cuisine: 4,
  tag: 3,
  ingredient: 2,
  description: 1,
};

/**
 * Score and rank recipes against a search query.
 * Returns recipes sorted by score descending, filtered to score > 0.
 */
export function rankRecipes(allRecipes: Recipe[], query: string): ScoredRecipe[] {
  if (!query || query.trim().length < 2) return [];

  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);

  return allRecipes
    .map((recipe) => scoreRecipe(recipe, q, words))
    .filter((sr) => sr.score > 0)
    .sort((a, b) => b.score - a.score);
}

function scoreRecipe(recipe: Recipe, query: string, words: string[]): ScoredRecipe {
  let score = 0;
  let matchType: ScoredRecipe["matchType"] = "none";

  const title = recipe.title.toLowerCase();
  const cuisine = recipe.cuisine.toLowerCase();
  const description = recipe.description.toLowerCase();

  // Title — exact match
  if (title === query) {
    score += WEIGHTS.titleExact;
    matchType = "title";
  }
  // Title — starts with query
  else if (title.startsWith(query)) {
    score += WEIGHTS.titlePartial + 2;
    matchType = "title";
  }
  // Title — contains query
  else if (title.includes(query)) {
    score += WEIGHTS.titlePartial;
    matchType = "title";
  }
  // Title — all words match
  else if (words.length > 1 && words.every((w) => title.includes(w))) {
    score += WEIGHTS.titlePartial - 1;
    matchType = "title";
  }

  // Cuisine match
  if (cuisine.includes(query) || words.some((w) => cuisine.includes(w))) {
    score += WEIGHTS.cuisine;
    if (matchType === "none") matchType = "cuisine";
  }

  // Tag match
  const tagMatch = recipe.tags.some((t) => {
    const tl = t.toLowerCase();
    return tl.includes(query) || words.some((w) => tl.includes(w));
  });
  if (tagMatch) {
    score += WEIGHTS.tag;
    if (matchType === "none") matchType = "tag";
  }

  // Ingredient match
  const ingredientMatch = recipe.ingredients.some((i) => {
    const name = i.name.toLowerCase();
    return name.includes(query) || words.some((w) => name.includes(w));
  });
  if (ingredientMatch) {
    score += WEIGHTS.ingredient;
    if (matchType === "none") matchType = "ingredient";
  }

  // Description match
  if (description.includes(query)) {
    score += WEIGHTS.description;
    if (matchType === "none") matchType = "description";
  }

  // Quality boost — higher rated recipes rank higher
  if (score > 0) {
    score *= (recipe.rating / 5);
  }

  return { recipe, score, matchType };
}

// ─── Recent Searches ────────────────────────────────

const RECENT_KEY = "cookgenie_recent_searches";
const MAX_RECENT = 5;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const recent = getRecentSearches().filter((s) => s !== query.trim());
    recent.unshift(query.trim());
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // localStorage unavailable
  }
}
