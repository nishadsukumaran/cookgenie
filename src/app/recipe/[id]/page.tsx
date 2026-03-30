"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { transformRecipe } from "@/lib/engines/transformation";
import { computeTrustMetrics } from "@/lib/engines/transformation/trust";
import type { TransformationWarning } from "@/lib/engines/types";

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recipe = getRecipeById(params.id as string);
  const [servings, setServings] = useState(recipe?.servings ?? 4);
  const [isSaved, setIsSaved] = useState(false);
  const [activeAction, setActiveAction] = useState<string | undefined>();

  if (!recipe) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Recipe not found</p>
      </div>
    );
  }

  const transformation = useMemo(
    () =>
      transformRecipe(recipe.ingredients, recipe.servings, recipe.calories, {
        targetServings: servings,
      }),
    [recipe, servings]
  );

  // Determine if this is pure scaling or a real modification
  const isModified = servings !== recipe.servings;
  const transformationType = isModified ? "scaling" as const : "scaling" as const;
  // Future: when substitutions or calorie reductions are applied on this page,
  // change to "modification" or "substitution"

  const trustMetrics = useMemo(
    () =>
      computeTrustMetrics(
        recipe.ingredients,
        transformation.ingredients,
        recipe.calories,
        transformation.calories,
        transformation.warnings,
        transformationType
      ),
    [recipe, transformation, transformationType]
  );

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
        router.push(`/ask?message=${encodeURIComponent(
          actionId === "reduce-calories"
            ? `Reduce calories by 20% for ${recipe.title}`
            : `Make ${recipe.title} healthier but keep the signature`
        )}&recipeId=${recipe.id}`);
        break;
      case "reduce-spice":
        router.push(`/ask?message=${encodeURIComponent(`Reduce spice for ${recipe.title}`)}&recipeId=${recipe.id}`);
        break;
    }
  }

  return (
    <div className="min-h-screen pb-28">
      <AppHeader
        showBack
        transparent
        rightAction={
          <div className="flex gap-1">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm"
              aria-label={isSaved ? "Remove from saved" : "Save recipe"}
            >
              <Bookmark
                className={`h-4.5 w-4.5 ${isSaved ? "fill-primary text-primary" : ""}`}
              />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm"
              aria-label="Share recipe"
            >
              <Share2 className="h-4.5 w-4.5" />
            </button>
          </div>
        }
      />

      {/* Hero Image */}
      <div className="relative -mt-14 h-56 w-full bg-gradient-to-br from-amber-light to-amber/20">
        <div className="flex h-full w-full items-center justify-center text-7xl">
          {recipe.cuisine === "Indian"
            ? "🍛"
            : recipe.cuisine === "Arabic"
              ? "🫓"
              : recipe.cuisine === "Middle Eastern"
                ? "🍳"
                : "🥗"}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4">
        {/* Title & Tags */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <RecipeOwnerBadge type="original" />
            {recipe.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <h1 className="mt-2 font-heading text-3xl">{recipe.title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            {recipe.description}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4 flex flex-wrap gap-2"
        >
          <StatPill icon={<Clock className="h-3.5 w-3.5" />} label={`${recipe.prepTime + recipe.cookingTime} min total`} />
          <StatPill icon={<Flame className="h-3.5 w-3.5" />} label={`${transformation.calories} cal`} highlight={isModified} />
          <StatPill icon={<Star className="h-3.5 w-3.5 fill-amber text-amber" />} label={recipe.rating.toString()} />
          <StatPill icon={<ChefHat className="h-3.5 w-3.5" />} label={recipe.difficulty} />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-4"
        >
          <QuickActions activeId={activeAction} onAction={handleQuickAction} />
        </motion.div>

        {/* Trust Layer */}
        <AnimatePresence>
          {isModified && transformationType === "scaling" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                <ShieldCheck className="h-4 w-4 text-green-600" />
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
          {isModified && transformationType !== "scaling" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <AuthenticityMeter
                  score={trustMetrics.authenticity.score}
                  label={trustMetrics.authenticity.label}
                  className="flex-1"
                />
              </div>
              <ConfidenceRiskBadge
                confidence={trustMetrics.confidence}
                risk={trustMetrics.risk}
              />
              <BeforeAfterCard comparison={trustMetrics.comparison} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Authenticity Badge (simple, always visible when unmodified) */}
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Servings</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setServings(Math.max(1, servings - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted"
              aria-label="Decrease servings"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-lg font-semibold tabular-nums">
              {servings}
            </span>
            <button
              onClick={() => setServings(servings + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted"
              aria-label="Increase servings"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>

        {/* Ingredients */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl">Ingredients</h2>
            <span className="text-xs text-muted-foreground">
              {transformation.ingredients.length} items
            </span>
          </div>
          <div className="mt-3 rounded-2xl border border-border bg-card px-4">
            {transformation.ingredients.map((ingredient, i) => (
              <div key={i} className="flex items-center">
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <h2 className="font-heading text-xl">Smart Substitutions</h2>
            <div className="mt-3 space-y-2.5">
              {recipe.substitutions.map((sub, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{sub.original}</span>
                    <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-primary">
                      {sub.substitute}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {sub.impact}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Steps */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6"
        >
          <h2 className="font-heading text-xl">Preparation</h2>
          <div className="mt-3 space-y-3">
            {recipe.steps.map((step) => (
              <StepCard key={step.number} step={step} />
            ))}
          </div>
        </motion.section>
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
              <Button variant="outline" className="h-12 rounded-2xl px-4">
                <Save className="h-4 w-4" />
              </Button>
            </SaveVariantDialog>
          )}
          <Button
            variant="outline"
            onClick={() => router.push(`/ask?recipe=${recipe.id}`)}
            className="h-12 rounded-2xl px-4"
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
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
    iconColor: "text-blue-500",
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
    <div
      className={`flex items-start gap-2.5 rounded-2xl border p-3.5 ${config.bg}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconColor}`} />
      <p className={`text-xs leading-relaxed ${config.text}`}>
        {warning.message}
      </p>
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
      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
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
