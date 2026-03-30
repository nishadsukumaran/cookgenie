"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bookmark, Layers, ShieldCheck, Clock, ChefHat } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/data/mock-data";

interface SavedVariant {
  id: string;
  name: string;
  servings: number;
  changeSummary: string | null;
  createdAt: string;
  trustMetrics: {
    confidence: { score: number; label: string };
    authenticity: { score: number; label: string };
    caloriesBefore: number;
    caloriesAfter: number;
  } | null;
  baseRecipeId: string;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function SavedPage() {
  const [tab, setTab] = useState<"recipes" | "versions">("recipes");
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [variants, setVariants] = useState<SavedVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  useEffect(() => {
    setLoadingRecipes(true);
    fetch("/api/saved")
      .then((r) => r.json())
      .then((data) => setSavedRecipes(data.savedRecipes ?? []))
      .catch(() => {})
      .finally(() => setLoadingRecipes(false));
  }, []);

  useEffect(() => {
    if (tab === "versions" && variants.length === 0) {
      setLoadingVariants(true);
      fetch("/api/variants")
        .then((r) => r.json())
        .then((data) => setVariants(data.variants ?? []))
        .catch(() => {})
        .finally(() => setLoadingVariants(false));
    }
  }, [tab, variants.length]);

  return (
    <div className="min-h-screen">
      <AppHeader title="Saved" />

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl bg-muted p-1">
          <button
            onClick={() => setTab("recipes")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors",
              tab === "recipes"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bookmark className="h-3.5 w-3.5" />
            Recipes
          </button>
          <button
            onClick={() => setTab("versions")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors",
              tab === "versions"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            My Versions
          </button>
        </div>

        {/* Saved Recipes Tab */}
        {tab === "recipes" && (
          <div className="mt-4">
            {loadingRecipes ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : savedRecipes.length > 0 ? (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                <motion.p
                  variants={fadeUp}
                  className="text-sm text-muted-foreground"
                >
                  {savedRecipes.length} saved recipes
                </motion.p>
                {savedRecipes.map((recipe) => (
                  <motion.div key={recipe.id} variants={fadeUp}>
                    <RecipeCard recipe={recipe} variant="compact" />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={<Bookmark className="h-6 w-6" />}
                title="No saved recipes"
                description="Tap the bookmark icon on any recipe to save it here"
                action={
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => window.location.href = "/search"}
                  >
                    Browse recipes
                  </Button>
                }
              />
            )}
          </div>
        )}

        {/* My Versions Tab */}
        {tab === "versions" && (
          <div className="mt-4">
            {loadingVariants ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : variants.length > 0 ? (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                <motion.p
                  variants={fadeUp}
                  className="text-sm text-muted-foreground"
                >
                  {variants.length} custom version{variants.length !== 1 ? "s" : ""}
                </motion.p>
                {variants.map((variant) => (
                  <motion.div key={variant.id} variants={fadeUp}>
                    <VariantCard variant={variant} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={<Layers className="h-6 w-6" />}
                title="No saved versions"
                description="Modify a recipe's servings or calories, then tap the save icon to create your own version"
                action={
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => window.location.href = "/recipe/butter-chicken"}
                  >
                    Try modifying Butter Chicken
                  </Button>
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VariantCard({ variant }: { variant: SavedVariant }) {
  const trust = variant.trustMetrics;
  const calSaved = trust
    ? trust.caloriesBefore - trust.caloriesAfter
    : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">{variant.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {variant.servings} servings
            {calSaved > 0 && ` · ${calSaved} cal saved/serving`}
          </p>
        </div>
        {trust && (
          <div className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700">
            <ShieldCheck className="h-3 w-3" />
            {trust.authenticity.score}%
          </div>
        )}
      </div>

      {variant.changeSummary && (
        <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">
          {variant.changeSummary}
        </p>
      )}

      {trust && (
        <div className="mt-2.5 flex gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
            {trust.authenticity.label}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
            {trust.confidence.score}% confident
          </span>
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        {new Date(variant.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
