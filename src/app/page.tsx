"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ChefHat,
  Flame,
  ArrowRightLeft,
  Sliders,
  Play,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { SearchInput } from "@/components/search/search-input";
import { CategoryChip } from "@/components/search/category-chip";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { Button } from "@/components/ui/button";
import { categories, recipes } from "@/data/mock-data";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const powers = [
  {
    icon: Flame,
    title: "Rescue",
    description: "Fix mistakes while cooking",
    color: "bg-red-50 text-red-600 border-red-200",
    prompt: "I added too much salt",
  },
  {
    icon: ArrowRightLeft,
    title: "Swap",
    description: "Smart ingredient substitutions",
    color: "bg-blue-50 text-blue-600 border-blue-200",
    prompt: "I don't have cream",
  },
  {
    icon: Sliders,
    title: "Modify",
    description: "Adapt calories, spice & more",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    prompt: "Make this healthier",
  },
];

interface ActiveSession {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeCuisine: string;
  currentStep: number;
  totalSteps: number;
  servingsUsed: number;
  startedAt: string;
}

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  useEffect(() => {
    fetch("/api/sessions/active")
      .then((r) => r.json())
      .then((data) => setActiveSessions(data.sessions ?? []))
      .catch(() => {});
  }, []);

  const topPicks = recipes.slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden bg-gradient-to-b from-amber-light/60 via-amber-light/20 to-background px-4 pb-6 pt-12"
      >
        <div className="mx-auto max-w-lg">
          {/* Logo — tappable, always returns Home */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-2xl">CookGenie</h1>
              <p className="text-xs text-muted-foreground">
                Your AI cooking companion
              </p>
            </div>
          </Link>

          <div className="mt-6">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={() =>
                searchQuery &&
                router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
              }
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {categories.map((cat) => (
              <CategoryChip
                key={cat.id}
                label={cat.label}
                icon={cat.icon}
                onClick={() =>
                  router.push(`/search?q=${encodeURIComponent(cat.label)}`)
                }
              />
            ))}
          </div>
        </div>
      </motion.section>

      <div className="mx-auto max-w-lg px-4">
        {/* Resume Cooking — prominent, above everything else */}
        {activeSessions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5"
          >
            {activeSessions.map((session) => (
              <button
                key={session.id}
                onClick={() =>
                  router.push(`/cook/${session.recipeId}`)
                }
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-amber-light/40 to-card p-4 shadow-md transition-shadow hover:shadow-lg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Play className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Resume Cooking
                  </p>
                  <p className="mt-0.5 text-sm font-bold">{session.recipeName}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Step {session.currentStep} of {session.totalSteps}
                    </span>
                    <span>·</span>
                    <span>{session.servingsUsed} servings</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {timeAgo(session.startedAt)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{
                        width: `${(session.currentStep / session.totalSteps) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-primary" />
              </button>
            ))}
          </motion.section>
        )}

        {/* 3 Powers */}
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-6"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            What CookGenie does
          </motion.p>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {powers.map((power) => (
              <motion.button
                key={power.title}
                variants={fadeUp}
                whileTap={{ scale: 0.96 }}
                onClick={() =>
                  router.push(
                    `/ask?message=${encodeURIComponent(power.prompt)}`
                  )
                }
                className={`flex flex-col items-center gap-2 rounded-2xl border p-3.5 transition-shadow hover:shadow-md ${power.color}`}
              >
                <power.icon className="h-5 w-5" />
                <span className="text-xs font-bold">{power.title}</span>
                <span className="text-[10px] leading-tight opacity-70 text-center">
                  {power.description}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* AI Top Picks */}
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-8"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-lg">AI Top Picks</h2>
          </motion.div>
          <div className="mt-3 space-y-3">
            {topPicks.map((recipe) => (
              <motion.div key={recipe.id} variants={fadeUp}>
                <RecipeCard recipe={recipe} variant="featured" showAiSummary />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Try CookGenie prompts */}
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-8 mb-8"
        >
          <motion.div variants={fadeUp}>
            <h2 className="font-heading text-lg">Try asking</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap any prompt to see CookGenie in action
            </p>
          </motion.div>
          <div className="mt-3 space-y-2">
            {[
              { icon: "🧂", text: "I added too much salt to my butter chicken" },
              { icon: "🥛", text: "I don't have cream, what can I use?" },
              { icon: "💚", text: "Make butter chicken healthier but keep the signature" },
              { icon: "🌶️", text: "This curry is way too spicy, help!" },
              { icon: "📏", text: "Adjust this recipe for 8 people" },
            ].map((prompt) => (
              <motion.button
                key={prompt.text}
                variants={fadeUp}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  router.push(
                    `/ask?message=${encodeURIComponent(prompt.text)}`
                  )
                }
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="text-lg">{prompt.icon}</span>
                <span className="flex-1 text-sm text-foreground">
                  {prompt.text}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </motion.button>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
