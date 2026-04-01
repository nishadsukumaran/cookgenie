"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type SearchFilters,
  EMPTY_FILTERS,
  filtersToQueryParams,
} from "@/lib/search/filters";
import type { Recipe } from "@/data/mock-data";

// ─── Types ─────────────────────────────────────────

export interface AiCandidate {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  cookingTime: number;
  prepTime: number;
  difficulty: string;
  servings: number;
  calories: number;
  tags: string[];
  ingredients: { name: string; amount: number; unit: string; category: string }[];
  steps: { number: number; instruction: string; duration?: number; tip?: string }[];
  source: string;
}

export interface UseRecipeSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  filters: SearchFilters;
  setFilter: (key: keyof SearchFilters, value: string | null) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  localRecipes: Recipe[];
  localLoading: boolean;
  aiCandidates: AiCandidate[];
  aiLoading: boolean;
  aiSearched: boolean;
  triggerAiSearch: () => void;
  previewCandidate: AiCandidate | null;
  setPreviewCandidate: (c: AiCandidate | null) => void;
}

const DEBOUNCE_MS = 300;

export function useRecipeSearch(initialQuery = ""): UseRecipeSearchReturn {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);

  const [localRecipes, setLocalRecipes] = useState<Recipe[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  const [aiCandidates, setAiCandidates] = useState<AiCandidate[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSearched, setAiSearched] = useState(false);

  const [previewCandidate, setPreviewCandidate] = useState<AiCandidate | null>(null);

  // Abort controller ref for cancelling in-flight local searches
  const abortRef = useRef<AbortController | null>(null);

  const hasActiveFilters = !!(filters.cuisine || filters.time || filters.difficulty || filters.dietary);

  // ─── Local DB Search (debounced) ──────────────────

  useEffect(() => {
    // Reset all results when query or filters change
    setAiCandidates([]);
    setAiSearched(false);
    setLocalLoading(true);  // Show skeleton immediately, not stale results

    const timer = setTimeout(async () => {
      // Cancel previous request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Build URL
      const params = filtersToQueryParams(filters);
      if (query.trim().length >= 2) params.set("q", query.trim());

      // Don't fetch if no query and no filters
      if (!query.trim() && !hasActiveFilters) {
        // Fetch all published recipes
        setLocalLoading(true);
        try {
          const res = await fetch("/api/recipes", { signal: controller.signal });
          if (res.ok) {
            const data = await res.json();
            setLocalRecipes(data.recipes ?? []);
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
        } finally {
          setLocalLoading(false);
        }
        return;
      }

      setLocalLoading(true);
      try {
        const res = await fetch(`/api/recipes?${params.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setLocalRecipes(data.recipes ?? []);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      } finally {
        setLocalLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // hasActiveFilters intentionally omitted — derived from filters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filters]);

  // ─── AI Search (manual trigger) ───────────────────

  const triggerAiSearch = useCallback(async () => {
    if (aiLoading) return;

    const searchQuery = query.trim() || "popular recipes";
    setAiLoading(true);
    setAiSearched(true);

    try {
      const res = await fetch("/api/recipes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          filters: hasActiveFilters ? filters : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiCandidates(data.candidates ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setAiLoading(false);
    }
  }, [query, filters, hasActiveFilters, aiLoading]);

  // ─── Filter Helpers ───────────────────────────────

  const setFilter = useCallback(
    (key: keyof SearchFilters, value: string | null) => {
      setFilters((prev) => ({
        ...prev,
        [key]: prev[key] === value ? null : value, // toggle behavior
      }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  return {
    query,
    setQuery,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    localRecipes,
    localLoading,
    aiCandidates,
    aiLoading,
    aiSearched,
    triggerAiSearch,
    previewCandidate,
    setPreviewCandidate,
  };
}
