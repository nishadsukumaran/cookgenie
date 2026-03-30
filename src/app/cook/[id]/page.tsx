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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRecipeById } from "@/data/mock-data";

export default function CookModePage() {
  const params = useParams();
  const router = useRouter();
  const recipe = getRecipeById(params.id as string);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [direction, setDirection] = useState(0);
  const sessionIdRef = useRef<string | null>(null);

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
        </div>
        <button
          onClick={() => router.push(`/ask?recipe=${recipe.id}&step=${currentStep + 1}`)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Ask CookPilot for help"
        >
          <MessageCircle className="h-5 w-5 text-primary" />
        </button>
      </header>

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

            {/* Duration */}
            {step.duration && (
              <div className="mt-5 flex justify-center">
                <span className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {step.duration} minutes
                </span>
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
            Need help? Ask CookPilot
          </Button>
        </div>
      </div>
    </div>
  );
}
