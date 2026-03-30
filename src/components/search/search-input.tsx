"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, TrendingUp, Star, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { recipes } from "@/data/mock-data";
import { rankRecipes, getRecentSearches, addRecentSearch } from "@/lib/search/ranking";
import { ImportPreviewSheet } from "@/components/recipe/import-preview-sheet";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showSuggestions?: boolean;
}

const quickSuggestions = [
  "Butter Chicken",
  "Healthy dinner",
  "Quick meals",
  "Chicken Biryani",
  "Vegetarian",
];

const cuisineEmoji: Record<string, string> = {
  Indian: "🍛",
  Arabic: "🫓",
  "Middle Eastern": "🍳",
  International: "🥗",
};

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = "What do you want to cook today?",
  className,
  autoFocus = false,
  showSuggestions = true,
}: SearchInputProps) {
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [onlineResults, setOnlineResults] = useState<any[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [previewCandidate, setPreviewCandidate] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const rankedResults = useMemo(() => {
    return rankRecipes(recipes, value).slice(0, 5);
  }, [value]);

  const hasQuery = value.trim().length >= 2;
  const showDropdown = focused && showSuggestions;

  function handleSelect(query: string) {
    addRecentSearch(query);
    setRecentSearches(getRecentSearches());
    onChange(query);
    setFocused(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  async function searchOnline() {
    if (!value.trim() || onlineLoading) return;
    setOnlineLoading(true);
    setOnlineResults([]);
    try {
      const res = await fetch("/api/recipes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: value.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setOnlineResults(data.candidates ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setOnlineLoading(false);
    }
  }

  function handleSubmit() {
    if (value.trim()) {
      addRecentSearch(value.trim());
      setRecentSearches(getRecentSearches());
    }
    setFocused(false);
    onSubmit?.();
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground z-10" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="h-12 w-full rounded-2xl border border-border bg-card pl-12 pr-10 text-sm shadow-sm transition-shadow placeholder:text-muted-foreground focus:border-primary/30 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-muted hover:bg-muted/80 z-10"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Ranked results */}
          {hasQuery && rankedResults.length > 0 && (
            <div className="p-1.5">
              <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Best matches
              </p>
              {rankedResults.map((sr) => (
                <button
                  key={sr.recipe.id}
                  onClick={() => handleSelect(sr.recipe.title)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="text-lg">
                    {cuisineEmoji[sr.recipe.cuisine] ?? "🍽️"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sr.recipe.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {sr.recipe.cuisine} · {sr.recipe.cookingTime}m · {sr.recipe.difficulty}
                      {sr.matchType !== "title" && (
                        <span className="ml-1 text-primary/70">
                          · matched by {sr.matchType}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="h-3 w-3 fill-amber text-amber" />
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {sr.recipe.rating}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No local results — offer online search */}
          {hasQuery && rankedResults.length === 0 && onlineResults.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">
                No local recipes match &ldquo;{value}&rdquo;
              </p>
              <button
                onClick={searchOnline}
                disabled={onlineLoading}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {onlineLoading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...</>
                ) : (
                  <><Globe className="h-3.5 w-3.5" /> Search online with AI</>
                )}
              </button>
            </div>
          )}

          {/* Online search results */}
          {hasQuery && onlineResults.length > 0 && (
            <div className="p-1.5">
              <p className="px-3 py-1 text-[10px] font-semibold text-purple-600 uppercase tracking-wider">
                AI-generated recipes
              </p>
              {onlineResults.map((candidate: any) => (
                <button
                  key={candidate.id}
                  onClick={() => {
                    setPreviewCandidate(candidate);
                    setPreviewOpen(true);
                    setFocused(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <Globe className="h-4 w-4 text-purple-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{candidate.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {candidate.cuisine} · {candidate.cookingTime}m · {candidate.calories} cal
                    </p>
                  </div>
                  <span className="text-[10px] text-purple-500 font-medium shrink-0">Preview</span>
                </button>
              ))}
            </div>
          )}

          {/* Also offer online search when local results exist but are few */}
          {hasQuery && rankedResults.length > 0 && rankedResults.length < 3 && onlineResults.length === 0 && (
            <div className="border-t border-border/50 p-2.5 text-center">
              <button
                onClick={searchOnline}
                disabled={onlineLoading}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
              >
                {onlineLoading ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Searching...</>
                ) : (
                  <><Globe className="h-3 w-3" /> Find more recipes online</>
                )}
              </button>
            </div>
          )}

          {/* Recent + Popular (when no query) */}
          {!hasQuery && (
            <div className="p-1.5">
              {recentSearches.length > 0 && (
                <>
                  <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent
                  </p>
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleSelect(term)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{term}</span>
                    </button>
                  ))}
                  <div className="my-1 border-t border-border/50" />
                </>
              )}
              <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Popular
              </p>
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSelect(suggestion)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Import Preview Sheet */}
      <ImportPreviewSheet
        candidate={previewCandidate}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onImported={(data) => {
          setPreviewOpen(false);
          setOnlineResults([]);
          router.push(`/recipe/${data.slug}`);
        }}
      />
    </div>
  );
}
