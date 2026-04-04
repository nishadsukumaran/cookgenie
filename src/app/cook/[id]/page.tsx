"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Lightbulb,
  MessageCircle,
  Clock,
  Check,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CookTimer } from "@/components/cook/cook-timer";
import { getRecipeById } from "@/data/mock-data";
import { analyzeStepTiming } from "@/lib/engines/cooking/step-analysis";
import type { Recipe } from "@/data/mock-data";

export default function CookModePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.id as string;

  // Try mock data first (instant), fall back to API for imported recipes
  const mockRecipe = getRecipeById(slug);
  const [apiRecipe, setApiRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(!mockRecipe);

  useEffect(() => {
    if (mockRecipe) return;
    fetch(`/api/recipes/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.recipe) setApiRecipe(data.recipe);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, mockRecipe]);

  const recipe = mockRecipe ?? apiRecipe;

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [direction, setDirection] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const [timerAutoStart, setTimerAutoStart] = useState(false);
  const [alertType, setAlertType] = useState<"sound" | "voice" | "both" | "none">("sound");
  const [showSettings, setShowSettings] = useState(false);

  // Resume existing session or start a new one
  useEffect(() => {
    if (!recipe) return;

    // Check for existing active session first
    fetch("/api/sessions/active")
      .then((r) => r.json())
      .then((data) => {
        const existing = (data.sessions ?? []).find(
          (s: { recipeId: string }) => s.recipeId === recipe.id
        );
        if (existing) {
          // Resume: restore step and session ID
          sessionIdRef.current = existing.id;
          const resumeStep = Math.max(0, (existing.currentStep ?? 1) - 1); // DB is 1-indexed
          setCurrentStep(resumeStep);
          // Mark prior steps as completed
          const completed = new Set<number>();
          for (let i = 0; i < resumeStep; i++) completed.add(i);
          setCompletedSteps(completed);
          return;
        }
        // No existing session — start a new one
        return fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            recipeId: recipe.id,
            totalSteps: recipe.steps.length,
            servings: recipe.servings,
          }),
        })
          .then((r) => r.json())
          .then((d) => { sessionIdRef.current = d.sessionId; });
      })
      .catch(() => {});
  }, [recipe]);

  // Persist step changes to the session
  const persistStep = useCallback((step: number) => {
    if (!sessionIdRef.current) return;
    fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "step",
        sessionId: sessionIdRef.current,
        step: step + 1, // 1-indexed in DB
      }),
    }).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading recipe...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Recipe not found</p>
      </div>
    );
  }

  const step = recipe.steps[currentStep];
  const totalSteps = recipe.steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  const timeline = analyzeStepTiming(recipe.steps);
  const currentTiming = timeline.steps.find((t) => t.stepNumber === step?.number);
  const parallelGroup = timeline.parallelGroups.find((g) => g.steps.includes(step?.number));

  function goNext() {
    if (!isLastStep) {
      setDirection(1);
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      persistStep(nextStep);
    }
  }

  function goPrev() {
    if (!isFirstStep) {
      setDirection(-1);
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      persistStep(prevStep);
    }
  }

  function markComplete() {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    if (!isLastStep) goNext();
  }

  function finishCooking() {
    if (sessionIdRef.current) {
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", sessionId: sessionIdRef.current }),
      }).catch(() => {});
    }
    router.push(`/recipe/${recipe!.id}`);
  }

  const slideVariants = {
    enter: (d: number) => ({
      x: d > 0 ? 200 : -200,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (d: number) => ({
      x: d > 0 ? -200 : 200,
      opacity: 0,
    }),
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Exit cook mode"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{recipe.title}</p>
          <p className="text-sm font-semibold">
            Step {currentStep + 1} of {totalSteps}
          </p>
          {timeline.timeSaved > 0 && (
            <p className="text-[10px] text-sky-600 font-medium">
              ~{timeline.optimizedTotal}min total (saves {timeline.timeSaved}min)
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Timer settings"
          >
            <Settings className={`h-4 w-4 ${showSettings ? "text-primary" : "text-muted-foreground"}`} />
          </button>
          <button
            onClick={() => router.push(`/ask?recipe=${recipe.id}&step=${currentStep + 1}`)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Ask CookGenie for help"
          >
            <MessageCircle className="h-5 w-5 text-primary" />
          </button>
        </div>
      </header>

      {/* Timer Settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timer Settings</p>
              <label className="flex items-center justify-between">
                <span className="text-sm">Auto-start timers</span>
                <button
                  onClick={() => setTimerAutoStart(!timerAutoStart)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${timerAutoStart ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${timerAutoStart ? "translate-x-5" : ""}`} />
                </button>
              </label>
              <div>
                <span className="text-sm">Alert type</span>
                <div className="mt-1.5 flex gap-2">
                  {(["sound", "voice", "both", "none"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setAlertType(type)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${alertType === type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="px-4">
        <div className="h-1.5 w-full rounded-full bg-muted">
          <motion.div
            className="h-1.5 rounded-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full max-w-md"
          >
            {/* Step Number */}
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
                {step.number}
              </div>
            </div>

            {/* Instruction */}
            <p className="mt-6 text-center text-xl font-medium leading-relaxed">
              {step.instruction}
            </p>

            {/* Timer */}
            {step.duration && (
              <div className="mt-5">
                <CookTimer
                  durationMinutes={step.duration}
                  autoStart={timerAutoStart}
                  alertType={alertType}
                />
              </div>
            )}

            {/* Tip */}
            {step.tip && (
              <div className="mt-5 mx-auto max-w-sm rounded-2xl bg-amber-light/50 p-4">
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm text-accent-foreground">{step.tip}</p>
                </div>
              </div>
            )}

            {/* Parallel step hint */}
            {parallelGroup && currentTiming?.isPassive && (
              <div className="mt-4 mx-auto max-w-sm rounded-2xl bg-sky-50 border border-sky-200 p-3.5">
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <div>
                    <p className="text-xs font-semibold text-sky-700">Time-saving tip</p>
                    <p className="mt-0.5 text-xs text-sky-600 leading-relaxed">{parallelGroup.reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Mark Complete */}
            {!completedSteps.has(currentStep) && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={markComplete}
                  className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Check className="h-4 w-4" />
                  Mark as done
                </button>
              </div>
            )}
            {completedSteps.has(currentStep) && (
              <div className="mt-6 flex justify-center">
                <span className="flex items-center gap-2 rounded-full bg-green-50 px-5 py-2.5 text-sm font-medium text-green-700">
                  <Check className="h-4 w-4" />
                  Completed
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-border bg-background px-4 py-4">
        <div className="mx-auto flex max-w-md gap-3">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={isFirstStep}
            className="h-12 flex-1 rounded-2xl text-sm font-semibold"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          {isLastStep ? (
            <Button
              onClick={finishCooking}
              className="h-12 flex-1 rounded-2xl text-sm font-semibold"
            >
              Finish Cooking
            </Button>
          ) : (
            <Button
              onClick={goNext}
              className="h-12 flex-1 rounded-2xl text-sm font-semibold"
            >
              Next Step
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mx-auto mt-3 max-w-md">
          <Button
            variant="ghost"
            onClick={() => router.push(`/ask?recipe=${recipe.id}&step=${currentStep + 1}`)}
            className="w-full rounded-2xl text-sm text-primary hover:text-primary"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Need help? Ask CookGenie
          </Button>
        </div>
      </div>
    </div>
  );
}
