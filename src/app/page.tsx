"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  ArrowRight,
  ChefHat,
  Flame,
  ArrowRightLeft,
  Sliders,
  Play,
  Clock,
  Search,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { SearchInput } from "@/components/search/search-input";
import { CategoryChip } from "@/components/search/category-chip";
import { Button } from "@/components/ui/button";
import { categories, recipes } from "@/data/mock-data";
import type { Recipe } from "@/data/mock-data";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const powers = [
  {
    icon: Flame,
    title: "Rescue",
    description: "Fix cooking mistakes in real time",
    colorBg: "bg-red-50",
    colorIcon: "text-red-500",
    colorBorder: "border-red-100",
    prompt: "I added too much salt to my dish",
  },
  {
    icon: ArrowRightLeft,
    title: "Substitute",
    description: "Smart ingredient swaps",
    colorBg: "bg-sky-50",
    colorIcon: "text-sky-500",
    colorBorder: "border-sky-100",
    prompt: "I don't have cream, what can I use?",
  },
  {
    icon: Sliders,
    title: "Adapt",
    description: "Calories, spice & portion control",
    colorBg: "bg-emerald-50",
    colorIcon: "text-emerald-500",
    colorBorder: "border-emerald-100",
    prompt: "Make this recipe healthier but keep the flavour",
  },
];

const cuisineImageMap: Record<string, string> = {
  Indian: "/images/butter-chicken.jpg",
  Arabic: "/images/machboos.jpg",
  "Middle Eastern": "/images/shakshuka.jpg",
};

function getRecipeImage(recipe: Recipe): string {
  if (recipe.image && !recipe.image.startsWith("/images/placeholder")) {
    return recipe.image;
  }
  return cuisineImageMap[recipe.cuisine] ?? "/images/butter-chicken.jpg";
}

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
  const featuredRecipe = recipes[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden"
      >
        {/* Hero image with overlay */}
        <div className="relative h-[320px] md:h-[400px] w-full">
          <Image
            src={getRecipeImage(featuredRecipe)}
            alt="Featured recipe"
            fill
            sizes="100vw"
            priority
            loading="eager"
            className="object-cover"
          />
          <div className="absolute inset-0 image-overlay-bottom" />
          {/* Dark top scrim for logo readability */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />

          {/* Logo */}
          <div className="absolute top-0 inset-x-0 px-4 pt-5">
            <div className="mx-auto max-w-lg flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg">
                  <ChefHat className="h-4.5 w-4.5 text-primary-foreground" />
                </div>
                <span className="font-heading text-xl text-white">CookGenie</span>
              </Link>
              <button
                onClick={() => router.push("/search")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Hero content over image */}
          <div className="absolute bottom-0 inset-x-0 px-4 pb-5">
            <div className="mx-auto max-w-lg">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">
                  AI Top Pick
                </p>
                <h2 className="font-heading text-2xl text-white leading-tight text-balance">
                  {featuredRecipe.title}
                </h2>
                <p className="mt-1 text-sm text-white/80 line-clamp-1">
                  {featuredRecipe.description}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/recipe/${featuredRecipe.id}`)}
                    className="h-9 rounded-full px-4 text-xs font-semibold shadow-lg pulse-cta"
                  >
                    View Recipe
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Button>
                  <div className="flex items-center gap-2 text-white/80 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {featuredRecipe.cookingTime}m
                    </span>
                    <span className="text-white/40">·</span>
                    <span>{featuredRecipe.calories} cal</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Search bar — floats below hero */}
        <div className="relative -mt-5 mx-auto max-w-lg px-4 z-10">
          <div className="rounded-2xl bg-card border border-border shadow-float p-1.5">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={() =>
                searchQuery &&
                router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
              }
              placeholder="Search recipes, cuisines, ingredients..."
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="mt-3 pb-1 px-4">
          <div className="mx-auto max-w-lg flex gap-2 overflow-x-auto hide-scrollbar">
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
        {/* Resume Cooking */}
        {activeSessions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5"
          >
            {activeSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => router.push(`/cook/${session.recipeId}`)}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-primary/25 bg-gradient-to-r from-amber-light/60 to-card p-4 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                  <Play className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Resume Cooking
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{session.recipeName}</p>
                  <div className="mt-1 flex items-center gap-2.5 text-xs text-muted-foreground">
                    <span>Step {session.currentStep} of {session.totalSteps}</span>
                    <span className="text-border">·</span>
                    <span>{session.servingsUsed} servings</span>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />{timeAgo(session.startedAt)}
                    </span>
                  </div>
                  <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(session.currentStep / session.totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-primary shrink-0" />
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
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              What CookGenie does
            </p>
          </motion.div>
          <div className="grid grid-cols-3 gap-2.5">
            {powers.map((power) => (
              <motion.button
                key={power.title}
                variants={fadeUp}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  router.push(`/ask?message=${encodeURIComponent(power.prompt)}`)
                }
                className={`flex flex-col items-start gap-2.5 rounded-2xl border ${power.colorBorder} ${power.colorBg} p-3.5 text-left transition-all hover:shadow-card`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 ${power.colorIcon}`}>
                  <power.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{power.title}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    {power.description}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Featured Recipes */}
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-8"
        >
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-xl">Top Picks</h2>
            </div>
            <button
              onClick={() => router.push("/search")}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              See all <ArrowRight className="h-3 w-3" />
            </button>
          </motion.div>

          <div className="space-y-3">
            {topPicks.map((recipe, index) => (
              <motion.div key={recipe.id} variants={fadeUp}>
                <FeaturedRecipeCard recipe={recipe} rank={index + 1} />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Smart prompts */}
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-8 mb-8"
        >
          <motion.div variants={fadeUp} className="mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-xl">Try asking</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Tap any prompt to see CookGenie in action
            </p>
          </motion.div>
          <div className="space-y-2">
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
                onClick={() => router.push(`/ask?message=${encodeURIComponent(prompt.text)}`)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-card transition-all hover:shadow-card-hover hover:border-primary/20"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-base">
                  {prompt.icon}
                </span>
                <span className="flex-1 text-sm text-foreground leading-relaxed">
                  {prompt.text}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </motion.button>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function FeaturedRecipeCard({ recipe, rank }: { recipe: Recipe; rank: number }) {
  const router = useRouter();
  const image = recipe.id === "butter-chicken"
    ? "/images/butter-chicken.jpg"
    : recipe.id === "chicken-biryani"
      ? "/images/chicken-biryani.jpg"
      : recipe.id === "paneer-butter-masala"
        ? "/images/paneer-butter-masala.jpg"
        : recipe.id === "shakshuka"
          ? "/images/shakshuka.jpg"
          : recipe.id === "machboos"
            ? "/images/machboos.jpg"
            : "/images/butter-chicken.jpg";

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/recipe/${recipe.id}`)}
      className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-3 text-left shadow-card transition-all hover:shadow-card-hover hover:border-primary/20"
    >
      {/* Image */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={image}
          alt={recipe.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
            #{rank}
          </span>
          {recipe.tags[0] && (
            <span className="rounded-full bg-accent/60 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
              {recipe.tags[0]}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-sm truncate">{recipe.title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1 leading-relaxed">
          {recipe.aiSummary}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />{recipe.cookingTime}m
          </span>
          <span className="text-border">·</span>
          <span>{recipe.calories} cal</span>
          <span className="text-border">·</span>
          <span className="text-amber-500">★ {recipe.rating}</span>
        </div>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </motion.button>
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
