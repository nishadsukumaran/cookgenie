"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Flame,
  ChefHat,
  Users,
  Check,
  Loader2,
  Globe,
  ChevronDown,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Accept any recipe-like object — works with both AiCandidate and PrimaryRecipe
interface RecipeCandidate {
  title: string;
  description: string;
  cuisine: string;
  cookingTime: number;
  prepTime?: number;
  difficulty: string;
  servings: number;
  calories: number;
  tags: string[];
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    category?: string;
  }>;
  steps: Array<{
    number: number;
    instruction: string;
    duration?: number;
    tip?: string;
  }>;
  id?: string;
  source?: string;
  why_match?: string;
}

interface ImportPreviewSheetProps {
  candidate: RecipeCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (data: { id: string; slug: string; title: string }) => void;
}

const VALID_CATEGORIES = ["protein", "dairy", "spice", "vegetable", "grain", "oil", "other"] as const;
type ValidCategory = (typeof VALID_CATEGORIES)[number];

function normalizeCategory(category: string | undefined): ValidCategory {
  if (!category) return "other";
  const normalized = category.toLowerCase().trim();
  return VALID_CATEGORIES.includes(normalized as ValidCategory) ? (normalized as ValidCategory) : "other";
}

const INITIAL_STEPS_SHOWN = 3;

export function ImportPreviewSheet({
  candidate,
  open,
  onOpenChange,
  onImported,
}: ImportPreviewSheetProps) {
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllSteps, setShowAllSteps] = useState(false);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen && importing) return;
    onOpenChange(isOpen);
    if (!isOpen) {
      setImported(false);
      setError(null);
      setShowAllSteps(false);
    }
  }

  async function handleImport() {
    if (!candidate) return;
    setImporting(true);
    setError(null);

    // Build a clean import payload with only the fields the API needs
    const payload = {
      title: candidate.title,
      description: candidate.description ?? "",
      cuisine: candidate.cuisine ?? "International",
      cookingTime: candidate.cookingTime ?? 30,
      prepTime: candidate.prepTime ?? 15,
      difficulty: candidate.difficulty ?? "Medium",
      servings: candidate.servings ?? 4,
      calories: candidate.calories ?? 0,
      tags: candidate.tags ?? [],
      ingredients: (candidate.ingredients ?? []).map((ing) => ({
        name: String(ing.name || "").trim(),
        amount: Number(ing.amount) || 1,
        unit: String(ing.unit || "piece"),
        category: normalizeCategory(ing.category),
      })),
      steps: (candidate.steps ?? []).map((step, idx) => ({
        number: idx + 1,
        instruction: String(step.instruction || ""),
        duration: step.duration != null ? (Number(step.duration) || null) : null,
        tip: step.tip ? String(step.tip) : null,
      })),
    };

    try {
      // Send diagnostic payload to analytics for debugging import failures
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "import_attempt",
          title: payload.title,
          ingredientCount: payload.ingredients.length,
          stepCount: payload.steps.length,
          sampleAmount: payload.ingredients[0]?.amount,
          sampleAmountType: typeof payload.ingredients[0]?.amount,
          timestamp: Date.now(),
        }),
      }).catch(() => {});

      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setImported(true);
        setTimeout(() => {
          onImported?.(data);
        }, 1200);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error ?? `Import failed (${res.status})`);
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : "Check your connection."}`);
    } finally {
      setImporting(false);
    }
  }

  if (!candidate) return null;

  const visibleSteps = showAllSteps
    ? candidate.steps
    : candidate.steps.slice(0, INITIAL_STEPS_SHOWN);
  const hiddenStepCount = candidate.steps.length - INITIAL_STEPS_SHOWN;
  const totalTime = (candidate.prepTime ?? 0) + (candidate.cookingTime ?? 0);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-3xl p-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3">
          <h2 className="font-heading text-xl font-semibold leading-tight">
            {candidate.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              {candidate.cuisine}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5",
                candidate.difficulty === "Easy" && "border-green-500/30 text-green-700",
                candidate.difficulty === "Medium" && "border-amber-500/30 text-amber-700",
                candidate.difficulty === "Hard" && "border-red-500/30 text-red-700",
              )}
            >
              {candidate.difficulty}
            </Badge>
            <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/20 text-[10px] px-2 py-0.5">
              <Globe className="mr-0.5 h-2.5 w-2.5" />
              AI
            </Badge>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-5 pb-28" style={{ maxHeight: "calc(85vh - 160px)" }}>
          {/* Description */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {candidate.description}
          </p>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap gap-2">
            <StatPill icon={<Clock className="h-3.5 w-3.5" />} label={`${totalTime} min`} />
            <StatPill icon={<Users className="h-3.5 w-3.5" />} label={`${candidate.servings} servings`} />
            <StatPill icon={<Flame className="h-3.5 w-3.5" />} label={`${candidate.calories} cal`} />
          </div>

          {/* Tags */}
          {candidate.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {candidate.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="my-5 border-t border-border" />

          {/* Ingredients */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ChefHat className="h-4 w-4 text-primary" />
              Ingredients
              <span className="text-xs font-normal text-muted-foreground">
                ({candidate.ingredients.length})
              </span>
            </h3>
            <div className="mt-3 rounded-xl border border-border bg-card p-3">
              <ul className="space-y-2">
                {candidate.ingredients.map((ing, i) => (
                  <li
                    key={`${ing.name}-${i}`}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-foreground">{ing.name}</span>
                    <span className="text-sm font-medium text-muted-foreground tabular-nums">
                      {ing.amount} {ing.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="my-5 border-t border-border" />

          {/* Steps */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Steps ({candidate.steps.length})
            </h3>
            <ol className="mt-3 space-y-4">
              <AnimatePresence initial={false}>
                {visibleSteps.map((step) => (
                  <motion.li
                    key={step.number}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {step.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed text-foreground">
                        {step.instruction}
                      </p>
                      {step.duration && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {step.duration} min
                        </span>
                      )}
                      {step.tip && (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          Tip: {step.tip}
                        </p>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>

            {!showAllSteps && hiddenStepCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllSteps(true)}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Show all {candidate.steps.length} steps
              </button>
            )}
          </div>
        </div>

        {/* Fixed bottom import button */}
        <div className="absolute inset-x-0 bottom-0 border-t border-border bg-popover px-5 py-4 safe-area-bottom">
          {error && (
            <p className="mb-2.5 text-center text-xs text-red-600 leading-relaxed">{error}</p>
          )}
          <Button
            onClick={handleImport}
            disabled={importing || imported}
            className="w-full h-12 rounded-2xl font-semibold text-base"
          >
            {imported ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Imported!
              </>
            ) : importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...
              </>
            ) : (
              "Import to CookGenie"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}
