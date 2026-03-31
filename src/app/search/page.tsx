"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  SlidersHorizontal,
  Trophy,
  Search,
  Lightbulb,
  ChefHat,
  ArrowRight,
  X,
} from "lucide-react";
import { SearchInput } from "@/components/search/search-input";
import { CategoryChip } from "@/components/search/category-chip";
import { RecipeDiscoveryCard } from "@/components/recipe/recipe-discovery-card";
import { AppHeader } from "@/components/layout/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { recipes, categories } from "@/data/mock-data";
import { rankRecipes } from "@/lib/search/ranking";
import { useRouter } from "next/navigation";

const MAX_RESULTS = 5;

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// Smart search intent detection
function detectIntent(query: string): { type: string; label: string } | null {
  const q = query.toLowerCase();
  if (q.includes("healthy") || q.includes("light") || q.includes("low cal")) {
    return { type: "health", label: "Healthy options" };
  }
  if (q.includes("quick") || q.includes("fast") || q.includes("easy") || q.includes("30 min")) {
    return { type: "quick", label: "Quick to make" };
  }
  if (q.includes("vegetarian") || q.includes("vegan") || q.includes("no meat")) {
    return { type: "veg", label: "Vegetarian / Vegan" };
  }
  if (q.includes("breakfast") || q.includes("brunch")) {
    return { type: "breakfast", label: "Breakfast & Brunch" };
  }
  return null;
}

// Smart follow-up suggestions based on query
function getSmartSuggestions(query: string): string[] {
  const q = query.toLowerCase();
  if (q.includes("chicken")) {
    return ["Healthy chicken", "Quick chicken", "Chicken biryani", "Chicken curry"];
  }
  if (q.includes("indian") || q.includes("curry")) {
    return ["Vegetarian curry", "Quick Indian", "Mild curry", "Spicy curry"];
  }
  if (q.includes("rice") || q.includes("biryani")) {
    return ["Dum biryani", "Pulao", "Fried rice", "Rice with lentils"];
  }
  return ["Healthy version", "Quick version", "Vegetarian version"];
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredRecipes = useMemo(() => {
    let pool = recipes;
    if (activeCategory) {
      const cat = categories.find((c) => c.id === activeCategory);
      if (cat) {
        const label = cat.label.toLowerCase();
        pool = pool.filter(
          (r) =>
            r.cuisine.toLowerCase().includes(label) ||
            r.tags.some((t) => t.toLowerCase().includes(label)) ||
            r.difficulty.toLowerCase() === label
        );
      }
    }
    if (query.trim().length >= 2) {
      return rankRecipes(pool, query).slice(0, MAX_RESULTS).map((sr) => sr.recipe);
    }
    return pool.sort((a, b) => b.rating - a.rating).slice(0, MAX_RESULTS);
  }, [query, activeCategory]);

  const hasQuery = query.trim().length > 0 || activeCategory !== null;
  const intent = hasQuery && query.trim().length >= 2 ? detectIntent(query) : null;
  const smartSuggestions = hasQuery && query.trim().length >= 2 ? getSmartSuggestions(query) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky search header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 py-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            autoFocus={!initialQuery}
            placeholder="Try 'healthy butter chicken' or 'quick dinner'..."
            showSuggestions={true}
          />
        </div>

        {/* Category chips */}
        <div className="pb-3 px-4">
          <div className="mx-auto max-w-lg flex gap-2 overflow-x-auto hide-scrollbar">
            {categories.map((cat) => (
              <CategoryChip
                key={cat.id}
                label={cat.label}
                icon={cat.icon}
                isActive={activeCategory === cat.id}
                onClick={() =>
                  setActiveCategory(activeCategory === cat.id ? null : cat.id)
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4">
        {/* Smart intent banner */}
        <AnimatePresence>
          {intent && (
            <motion.div
              key="intent"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="flex items-center gap-2 rounded-xl bg-primary/8 border border-primary/15 px-3.5 py-2.5">
                <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-xs text-foreground">
                  Showing <span className="font-semibold text-primary">{intent.label}</span> for &ldquo;{query}&rdquo;
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smart follow-ups */}
        <AnimatePresence>
          {smartSuggestions.length > 0 && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3"
            >
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Refine:
                </span>
                {smartSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground hover:border-primary/20"
                  >
                    {s}
                  </button>
                ))}
                {query && (
                  <button
                    onClick={() => router.push(`/ask?message=${encodeURIComponent(`Tell me more about ${query} recipes`)}`)}
                    className="shrink-0 flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
                  >
                    <Sparkles className="h-3 w-3" />
                    Ask AI
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredRecipes.length > 0 ? (
          <motion.div
            key={`${query}-${activeCategory}`}
            variants={stagger}
            initial="hidden"
            animate="show"
            className="mt-5 mb-8"
          >
            {/* Results header */}
            <motion.div variants={fadeUp} className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                {hasQuery ? (
                  <Sparkles className="h-4 w-4 text-primary" />
                ) : (
                  <Trophy className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-semibold">
                  {hasQuery
                    ? `${filteredRecipes.length} best matches`
                    : "Today's Top Picks"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {hasQuery
                    ? "Ranked by relevance, rating & authenticity"
                    : "AI-curated based on quality and popularity"}
                </p>
              </div>
            </motion.div>

            <div className="space-y-4">
              {filteredRecipes.map((recipe, i) => (
                <motion.div key={recipe.id} variants={fadeUp}>
                  <RecipeDiscoveryCard recipe={recipe} rank={i + 1} />
                </motion.div>
              ))}
            </div>

            {/* Ask AI fallback */}
            {hasQuery && (
              <motion.div variants={fadeUp} className="mt-6">
                <button
                  onClick={() => router.push(`/ask?message=${encodeURIComponent(`I'm looking for ${query} recipes. Can you help?`)}`)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-4 text-left transition-colors hover:bg-primary/10"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                    <ChefHat className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Didn&apos;t find what you&apos;re looking for?
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Ask CookGenie AI for personalized recipe suggestions
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <div className="mt-8">
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="No recipes found"
              description={`We couldn't find recipes matching "${query}". Try adjusting your search or ask CookGenie AI.`}
              action={
                <button
                  onClick={() => router.push(`/ask?message=${encodeURIComponent(`I'm looking for ${query} recipes`)}`)}
                  className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-opacity hover:opacity-90"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Ask CookGenie AI
                </button>
              }
            />
          </div>
        )}

        {/* No query — show discovery prompts */}
        {!hasQuery && (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="mt-6 mb-8"
          >
            <motion.div variants={fadeUp}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Explore ideas
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "🍛", label: "Indian Classics", query: "Indian" },
                  { icon: "🥗", label: "Healthy Bowls", query: "Healthy" },
                  { icon: "⚡", label: "Under 30 min", query: "Quick Meals" },
                  { icon: "🌱", label: "Vegetarian", query: "Vegetarian" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setQuery(item.query)}
                    className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-card transition-all hover:shadow-card-hover hover:border-primary/20"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
