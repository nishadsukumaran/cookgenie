"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Flame,
  Star,
  ChefHat,
  Users,
  Minus,
  Plus,
  MessageCircle,
  Play,
  Bookmark,
  Share2,
  ArrowRightLeft,
  AlertTriangle,
  Info,
  AlertCircle,
  Save,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AppHeader } from "@/components/layout/app-header";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { IngredientRow } from "@/components/recipe/ingredient-row";
import { StepCard } from "@/components/recipe/step-card";
import { AuthenticityBadge } from "@/components/recipe/authenticity-badge";
import { SubstitutionSheet } from "@/components/recipe/substitution-sheet";
import { AuthenticityMeter } from "@/components/recipe/authenticity-meter";
import { ConfidenceRiskBadge } from "@/components/recipe/confidence-risk-badge";
import { BeforeAfterCard } from "@/components/recipe/before-after-card";
import { QuickActions } from "@/components/recipe/quick-actions";
import { SaveVariantDialog } from "@/components/recipe/save-variant-dialog";
import { IngredientActionMenu } from "@/components/recipe/ingredient-action-menu";
import { AddIngredientSheet } from "@/components/recipe/add-ingredient-sheet";
import { RecipeOwnerBadge } from "@/components/recipe/recipe-owner-badge";
import { getRecipeById } from "@/data/mock-data";
import type { Recipe } from "@/data/mock-data";
import { transformRecipe } from "@/lib/engines/transformation";
import { computeTrustMetrics } from "@/lib/engines/transformation/trust";
import type { TransformationWarning } from "@/lib/engines/types";

const recipeImageMap: Record<string, string> = {
  "butter-chicken": "/images/butter-chicken.jpg",
  "chicken-biryani": "/images/chicken-biryani.jpg",
  "paneer-butter-masala": "/images/paneer-butter-masala.jpg",
  shakshuka: "/images/shakshuka.jpg",
  machboos: "/images/machboos.jpg",
};

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.id as string;

  // Try mock data first (instant), fall back to API for imported recipes
  const mockRecipe = getRecipeById(slug);
  const [apiRecipe, setApiRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(!mockRecipe);

  useEffect(() => {
    if (mockRecipe) return; // already have it from mock data
    fetch(`/api/recipes/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.recipe) setApiRecipe(data.recipe);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, mockRecipe]);

  const recipe = mockRecipe ?? apiRecipe;

  const [servings, setServings] = useState(recipe?.servings ?? 4);
  const [isSaved, setIsSaved] = useState(false);
  const [activeAction, setActiveAction] = useState<string | undefined>();

  // Sync servings when async recipe first loads (API recipes only)
  const recipeServings = recipe?.servings;
  useEffect(() => {
    if (recipeServings != null) {
      setServings(recipeServings);
    }
  }, [recipeServings]);

  // All hooks must be called before early returns (React rules of hooks)
  const recipeIngredients = recipe?.ingredients;
  const recipeCalories = recipe?.calories ?? 0;

  const transformation = useMemo(
    () => {
      const ings = recipeIngredients ?? [];
      const srvs = recipeServings ?? 4;
      return transformRecipe(ings, srvs, recipeCalories, { targetServings: servings });
    },
    [recipeIngredients, recipeServings, recipeCalories, servings]
  );

  const isModified = recipe ? servings !== recipe.servings : false;
  const transformationType = "scaling" as const;

  const trustMetrics = useMemo(
    () => {
      const ings = recipeIngredients ?? [];
      return computeTrustMetrics(
        ings,
        transformation.ingredients,
        recipeCalories,
        transformation.calories,
        transformation.warnings,
        transformationType
      );
    },
    [recipeIngredients, recipeCalories, transformation, transformationType]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <ChefHat className="mx-auto h-12 w-12 text-muted-foreground/30 animate-pulse" />
          <p className="mt-3 text-muted-foreground">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <ChefHat className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-muted-foreground">Recipe not found</p>
        </div>
      </div>
    );
  }

  function handleQuickAction(actionId: string) {
    if (!recipe) return;
    if (actionId === activeAction) {
      setActiveAction(undefined);
      setServings(recipe.servings);
      return;
    }
    setActiveAction(actionId);
    switch (actionId) {
      case "keep-authentic":
        setServings(recipe.servings);
        break;
      case "make-healthier":
      case "reduce-calories":
        router.push(
          `/ask?message=${encodeURIComponent(
            actionId === "reduce-calories"
              ? `Reduce calories by 20% for ${recipe.title}`
              : `Make ${recipe.title} healthier but keep the signature`
          )}&recipeId=${recipe.id}`
        );
        break;
      case "reduce-spice":
        router.push(
          `/ask?message=${encodeURIComponent(`Reduce spice for ${recipe.title}`)}&recipeId=${recipe.id}`
        );
        break;
    }
  }

  // Known images for seeded recipes; imported recipes get a cuisine-based fallback
  const cuisineFallback: Record<string, string> = {
    Indian: "/images/generic-recipe.jpg",
    Arabic: "/images/generic-recipe.jpg",
    "Middle Eastern": "/images/generic-recipe.jpg",
    Italian: "/images/generic-recipe.jpg",
  };
  const heroImage = recipeImageMap[recipe.id] ?? cuisineFallback[recipe.cuisine] ?? "/images/generic-recipe.jpg";

  return (
    <div className="min-h-screen pb-28 bg-background">
      {/* Transparent header over hero image */}
      <AppHeader
        showBack
        transparent
        rightAction={
          <div className="flex gap-1.5">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white transition-colors hover:bg-black/60"
              aria-label={isSaved ? "Remove from saved" : "Save recipe"}
            >
              <Bookmark
                className={`h-4 w-4 ${isSaved ? "fill-white" : ""}`}
              />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white transition-colors hover:bg-black/60"
              aria-label="Share recipe"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* Full-bleed hero */}
      <div className="relative -mt-14 h-72 w-full overflow-hidden">
        <Image
          src={heroImage}
          alt={recipe.title}
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 image-overlay-bottom" />

        {/* Hero text over image */}
        <div className="absolute bottom-0 inset-x-0 px-4 pb-5">
          <div className="mx-auto max-w-lg">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <RecipeOwnerBadge type="original" />
              {recipe.tags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag}
                  className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-[10px]"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="font-heading text-3xl text-white leading-tight text-balance">
              {recipe.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4">
        {/* Quick stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex flex-wrap gap-2"
        >
          <StatPill icon={<Clock className="h-3.5 w-3.5" />} label={`${recipe.prepTime + recipe.cookingTime} min`} />
          <StatPill icon={<Flame className="h-3.5 w-3.5" />} label={`${transformation.calories} cal`} highlight={isModified} />
          <StatPill icon={<Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />} label={recipe.rating.toString()} />
          <StatPill icon={<ChefHat className="h-3.5 w-3.5" />} label={recipe.difficulty} />
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-3 text-sm text-muted-foreground leading-relaxed"
        >
          {recipe.description}
        </motion.p>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-4"
        >
          <QuickActions activeId={activeAction} onAction={handleQuickAction} />
        </motion.div>

        {/* Trust Layer */}
        <AnimatePresence>
          {isModified && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="flex items-center gap-2.5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-green-800">
                    Scaled to {servings} servings — taste and authenticity unchanged
                  </p>
                  <p className="mt-0.5 text-[11px] text-green-600">
                    Only portion sizes adjusted. Calories per serving: {transformation.calories}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Authenticity Badge */}
        {!isModified && (
          <div className="mt-4">
            <AuthenticityBadge level="authentic" />
          </div>
        )}

        {/* Transformation Warnings */}
        <AnimatePresence>
          {transformation.warnings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              {transformation.warnings.map((warning, i) => (
                <WarningBanner key={i} warning={warning} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <Separator className="my-5" />

        {/* Servings Control */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <span className="text-sm font-semibold">Servings</span>
              {isModified && (
                <p className="text-[10px] text-primary font-medium">
                  Adjusted from {recipe.servings}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setServings(Math.max(1, servings - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background hover:bg-muted transition-colors"
              aria-label="Decrease servings"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-xl font-bold tabular-nums">
              {servings}
            </span>
            <button
              onClick={() => setServings(servings + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background hover:bg-muted transition-colors"
              aria-label="Increase servings"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>

        {/* Ingredients */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xl">Ingredients</h2>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {transformation.ingredients.length} items
            </span>
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            {transformation.ingredients.map((ingredient, i) => (
              <div
                key={i}
                className={`flex items-center px-4 ${
                  i < transformation.ingredients.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                <div className="flex-1">
                  <IngredientRow
                    ingredient={ingredient}
                    isModified={isModified}
                    onSubstitute={() => {}}
                  />
                </div>
                <IngredientActionMenu
                  ingredientName={ingredient.name}
                  recipeId={recipe.id}
                />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <AddIngredientSheet recipeId={recipe.id} />
          </div>
        </motion.section>

        {/* Substitutions */}
        {recipe.substitutions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-6"
          >
            <h2 className="font-heading text-xl mb-3">Smart Swaps</h2>
            <div className="space-y-2.5">
              {recipe.substitutions.map((sub, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-4 shadow-card"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{sub.original}</span>
                    <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-primary">{sub.substitute}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {sub.impact}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Steps */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xl">Preparation</h2>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {recipe.steps.length} steps
            </span>
          </div>
          <div className="space-y-3">
            {recipe.steps.map((step) => (
              <StepCard key={step.number} step={step} />
            ))}
          </div>
        </motion.section>

        {/* AI Summary callout */}
        {recipe.aiSummary && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary mb-1">AI Insight</p>
                <p className="text-sm text-foreground leading-relaxed">{recipe.aiSummary}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Sticky Actions */}
      <StickyActionBar>
        <div className="flex gap-2.5">
          <Button
            onClick={() => router.push(`/cook/${recipe.id}`)}
            className="flex-1 h-12 rounded-2xl text-sm font-semibold shadow-lg"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Cooking
          </Button>
          {isModified && (
            <SaveVariantDialog
              recipeId={recipe.id}
              recipeName={recipe.title}
              servings={servings}
              originalCalories={recipe.calories}
              trustMetrics={trustMetrics}
            >
              <Button variant="outline" className="h-12 rounded-2xl px-4 shadow-card">
                <Save className="h-4 w-4" />
              </Button>
            </SaveVariantDialog>
          )}
          <Button
            variant="outline"
            onClick={() => router.push(`/ask?recipe=${recipe.id}`)}
            className="h-12 rounded-2xl px-4 shadow-card"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      </StickyActionBar>
    </div>
  );
}

const warningSeverityConfig = {
  info: {
    icon: Info,
    bg: "bg-sky-50 border-sky-200",
    text: "text-sky-800",
    iconColor: "text-sky-500",
  },
  caution: {
    icon: AlertTriangle,
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    iconColor: "text-amber-500",
  },
  critical: {
    icon: AlertCircle,
    bg: "bg-red-50 border-red-200",
    text: "text-red-800",
    iconColor: "text-red-500",
  },
};

function WarningBanner({ warning }: { warning: TransformationWarning }) {
  const config = warningSeverityConfig[warning.severity];
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-2.5 rounded-2xl border p-3.5 ${config.bg}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconColor}`} />
      <p className={`text-xs leading-relaxed ${config.text}`}>{warning.message}</p>
    </div>
  );
}

function StatPill({
  icon,
  label,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
        highlight
          ? "bg-amber-light text-primary ring-1 ring-primary/20"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </span>
  );
}
