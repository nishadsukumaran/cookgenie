"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ChefHat,
  Flame,
  Globe,
  Heart,
  Ruler,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SPICE_LEVELS = [
  { value: "mild", label: "Mild", emoji: "🌶️", desc: "Gentle flavors, no heat" },
  { value: "medium", label: "Medium", emoji: "🌶️🌶️", desc: "A warm kick, still balanced" },
  { value: "hot", label: "Hot", emoji: "🌶️🌶️🌶️", desc: "Bold spice for heat lovers" },
  { value: "very_hot", label: "Very Hot", emoji: "🔥", desc: "Bring the fire — no mercy" },
];

const DIETARY_OPTIONS = [
  { value: "vegetarian", label: "Vegetarian", emoji: "🥬" },
  { value: "vegan", label: "Vegan", emoji: "🌱" },
  { value: "gluten-free", label: "Gluten-free", emoji: "🚫🌾" },
  { value: "dairy-free", label: "Dairy-free", emoji: "🚫🧀" },
  { value: "nut-free", label: "Nut-free", emoji: "🚫🥜" },
  { value: "halal", label: "Halal", emoji: "☪️" },
];

const CUISINE_OPTIONS = [
  { value: "indian", label: "Indian", emoji: "🇮🇳" },
  { value: "arabic", label: "Arabic", emoji: "🇸🇦" },
  { value: "middle eastern", label: "Middle Eastern", emoji: "🌍" },
  { value: "italian", label: "Italian", emoji: "🇮🇹" },
  { value: "chinese", label: "Chinese", emoji: "🇨🇳" },
  { value: "mexican", label: "Mexican", emoji: "🇲🇽" },
  { value: "thai", label: "Thai", emoji: "🇹🇭" },
  { value: "mediterranean", label: "Mediterranean", emoji: "🫒" },
];

const UNIT_OPTIONS = [
  { value: "metric", label: "Metric", desc: "Grams, milliliters, Celsius" },
  { value: "imperial", label: "Imperial", desc: "Ounces, cups, Fahrenheit" },
];

const STEPS = [
  { title: "Spice Level", icon: Flame },
  { title: "Dietary Needs", icon: Heart },
  { title: "Favorite Cuisines", icon: Globe },
  { title: "Units", icon: Ruler },
  { title: "All Set!", icon: CheckCircle2 },
];

interface Preferences {
  spicePreference: string;
  dietary: string[];
  cuisines: string[];
  unitSystem: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Preferences>({
    spicePreference: "medium",
    dietary: [],
    cuisines: [],
    unitSystem: "metric",
  });
  const [saving, setSaving] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("google", { callbackUrl: "/onboarding" });
    }
  }, [status]);

  // If already has preferences, skip to home
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/preferences")
        .then((r) => r.json())
        .then((data) => {
          const p = data.preferences;
          if (p && (p.dietary?.length || p.cuisines?.length)) {
            // Already onboarded
            router.push("/");
          } else if (p) {
            setPrefs({
              spicePreference: p.spicePreference ?? "medium",
              dietary: p.dietary ?? [],
              cuisines: p.cuisines ?? [],
              unitSystem: p.unitSystem ?? "metric",
            });
          }
        })
        .catch(() => {});
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  const updatePrefs = (updates: Partial<Preferences>) => {
    setPrefs((prev) => ({ ...prev, ...updates }));
  };

  const toggleArray = (key: "dietary" | "cuisines", value: string) => {
    setPrefs((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!prefs.spicePreference;
      case 1:
        return true; // dietary is optional
      case 2:
        return prefs.cuisines.length > 0;
      case 3:
        return !!prefs.unitSystem;
      default:
        return true;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prefs,
          authenticityPreference: "flexible",
          calorieGoal: null,
        }),
      });
      router.push("/");
    } catch {
      alert("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-surface">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className={cn(
                  "flex-1 h-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Step {step + 1} of {STEPS.length}: {STEPS[step].title}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Step 0: Spice Level */}
        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <Flame className="mx-auto h-10 w-10 text-orange-500" />
              <h1 className="text-2xl font-heading font-bold">How spicy do you like it?</h1>
              <p className="text-muted-foreground">
                We'll use this as the default for all recipes. You can always adjust per dish.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {SPICE_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => updatePrefs({ spicePreference: level.value })}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                    prefs.spicePreference === level.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30",
                  )}
                >
                  <span className="text-2xl">{level.emoji}</span>
                  <div className="flex-1">
                    <span className="font-semibold text-sm">{level.label}</span>
                    <p className="text-xs text-muted-foreground">{level.desc}</p>
                  </div>
                  {prefs.spicePreference === level.value && (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 1: Dietary */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <Heart className="mx-auto h-10 w-10 text-rose-500" />
              <h1 className="text-2xl font-heading font-bold">Any dietary needs?</h1>
              <p className="text-muted-foreground">
                Select all that apply, or skip if you have no restrictions.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {DIETARY_OPTIONS.map((opt) => {
                const selected = prefs.dietary.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleArray("dietary", opt.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/30",
                    )}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {prefs.dietary.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {prefs.dietary.map((d) => (
                  <Badge key={d} className="rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                    {d}
                  </Badge>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Cuisines */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <Globe className="mx-auto h-10 w-10 text-blue-500" />
              <h1 className="text-2xl font-heading font-bold">What cuisines do you love?</h1>
              <p className="text-muted-foreground">
                Pick at least one. We'll prioritize these in your recommendations.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CUISINE_OPTIONS.map((opt) => {
                const selected = prefs.cuisines.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleArray("cuisines", opt.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/30",
                    )}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {prefs.cuisines.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {prefs.cuisines.map((c) => (
                  <Badge key={c} className="rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Units */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <Ruler className="mx-auto h-10 w-10 text-emerald-500" />
              <h1 className="text-2xl font-heading font-bold">Measurement system</h1>
              <p className="text-muted-foreground">
                We'll show ingredient amounts in your preferred system.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {UNIT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updatePrefs({ unitSystem: opt.value })}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border p-6 text-center transition-all",
                    prefs.unitSystem === opt.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30",
                  )}
                >
                  <ChefHat className={cn(
                    "h-8 w-8",
                    prefs.unitSystem === opt.value ? "text-primary" : "text-muted-foreground",
                  )} />
                  <div>
                    <span className="font-semibold">{opt.label}</span>
                    <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                  </div>
                  {prefs.unitSystem === opt.value && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-center"
          >
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-heading font-bold">You're all set!</h1>
            <p className="text-muted-foreground">
              Here's a summary of your preferences. You can change these anytime in your profile.
            </p>
            <div className="rounded-xl border border-border bg-card p-6 text-left space-y-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Spice Level</span>
                <p className="font-medium mt-1">
                  {SPICE_LEVELS.find((s) => s.value === prefs.spicePreference)?.emoji}{" "}
                  {SPICE_LEVELS.find((s) => s.value === prefs.spicePreference)?.label}
                </p>
              </div>
              {prefs.dietary.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Dietary</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {prefs.dietary.map((d) => (
                      <Badge key={d} variant="outline" className="rounded-full">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Cuisines</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {prefs.cuisines.map((c) => (
                    <Badge key={c} variant="outline" className="rounded-full">{c}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Units</span>
                <p className="font-medium mt-1 capitalize">{prefs.unitSystem}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={prev} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={!canProceed()} className="gap-2">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : step === STEPS.length - 1 ? (
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Start Cooking
                  <ChefHat className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
