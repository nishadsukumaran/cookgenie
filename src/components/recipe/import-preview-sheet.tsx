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

interface RecipeCandidate {
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
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    category: string;
  }>;
  steps: Array<{
    number: number;
    instruction: string;
    duration?: number;
    tip?: string;
  }>;
  source: string;
}

interface ImportPreviewSheetProps {
  candidate: RecipeCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (data: { id: string; slug: string; title: string }) => void;
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
    // Don't allow closing while import is in progress
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
    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidate),
      });

      if (res.ok) {
        const data = await res.json();
        setImported(true);
        setTimeout(() => {
          onImported?.(data);
        }, 1200);
      } else {
        setError("Import failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  if (!candidate) return null;

  const visibleSteps = showAllSteps
    ? candidate.steps
    : candidate.steps.slice(0, INITIAL_STEPS_SHOWN);
  const hiddenStepCount = candidate.steps.length - INITIAL_STEPS_SHOWN;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading text-xl">
            {candidate.title}
          </SheetTitle>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {candidate.cuisine}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0",
                candidate.difficulty === "Easy" &&
                  "border-green-500/30 text-green-700",
                candidate.difficulty === "Medium" &&
                  "border-amber-500/30 text-amber-700",
                candidate.difficulty === "Hard" &&
                  "border-red-500/30 text-red-700"
              )}
            >
              {candidate.difficulty}
            </Badge>
            <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/20 text-[10px] px-1.5 py-0">
              <Globe className="mr-0.5 h-2.5 w-2.5" />
              AI Generated
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-5 overflow-y-auto pb-24">
          {/* Description */}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {candidate.description}
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-2">
            <StatPill
              icon={<Clock className="h-3 w-3" />}
              label={`${candidate.prepTime + candidate.cookingTime} min`}
            />
            <StatPill
              icon={<Users className="h-3 w-3" />}
              label={`${candidate.servings} servings`}
            />
            <StatPill
              icon={<Flame className="h-3 w-3" />}
              label={`${candidate.calories} cal`}
            />
          </div>

          {/* Tags */}
          {candidate.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {candidate.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 font-normal"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Ingredients */}
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <ChefHat className="h-4 w-4 text-primary" />
              Ingredients
              <span className="text-xs font-normal text-muted-foreground">
                ({candidate.ingredients.length})
              </span>
            </h3>
            <ul className="mt-2 space-y-1.5">
              {candidate.ingredients.map((ing) => (
                <li
                  key={`${ing.name}-${ing.category}`}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-foreground">{ing.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {ing.amount} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div>
            <h3 className="text-sm font-semibold">Steps</h3>
            <ol className="mt-2 space-y-3">
              <AnimatePresence initial={false}>
                {visibleSteps.map((step) => (
                  <motion.li
                    key={step.number}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-3"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {step.number}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs leading-relaxed text-foreground">
                        {step.instruction}
                      </p>
                      {step.tip && (
                        <p className="mt-1 text-[11px] italic text-muted-foreground">
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
                className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Show all {candidate.steps.length} steps
              </button>
            )}
          </div>
        </div>

        {/* Fixed bottom import button */}
        <div className="absolute inset-x-0 bottom-0 border-t border-border bg-popover p-4">
          {error && (
            <p className="mb-2 text-center text-xs text-red-600">{error}</p>
          )}
          <Button
            onClick={handleImport}
            disabled={importing || imported}
            className="w-full h-11 rounded-2xl font-semibold"
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

function StatPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}
