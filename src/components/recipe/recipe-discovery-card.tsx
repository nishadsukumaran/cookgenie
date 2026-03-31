"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Star, ChefHat, Flame, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { Recipe } from "@/data/mock-data";

interface RecipeDiscoveryCardProps {
  recipe: Recipe;
  rank: number;
  className?: string;
}

const rankLabels = ["Best Match", "Runner Up", "Also Great", "Worth Trying", "Solid Choice"];

const recipeImageMap: Record<string, string> = {
  "butter-chicken": "/images/butter-chicken.jpg",
  "chicken-biryani": "/images/chicken-biryani.jpg",
  "paneer-butter-masala": "/images/paneer-butter-masala.jpg",
  shakshuka: "/images/shakshuka.jpg",
  machboos: "/images/machboos.jpg",
};

export function RecipeDiscoveryCard({
  recipe,
  rank,
  className,
}: RecipeDiscoveryCardProps) {
  const isTop = rank === 1;
  const image = recipeImageMap[recipe.id] ?? "/images/butter-chicken.jpg";

  return (
    <Link href={`/recipe/${recipe.id}`} className="block">
      <motion.article
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group relative overflow-hidden rounded-3xl border bg-card transition-all",
          "shadow-card hover:shadow-card-hover",
          isTop ? "border-primary/20" : "border-border",
          className
        )}
      >
        {/* Image */}
        <div className={cn("relative w-full overflow-hidden", isTop ? "h-52" : "h-44")}>
          <Image
            src={image}
            alt={recipe.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 image-overlay-bottom" />

          {/* Rank badge */}
          <div
            className={cn(
              "absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-md",
              isTop
                ? "bg-primary text-primary-foreground"
                : "bg-black/60 text-white backdrop-blur-sm"
            )}
          >
            #{rank} {rankLabels[rank - 1] ?? "Recommended"}
          </div>

          {/* Tags */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            {recipe.tags.slice(0, 1).map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
                  tag === "Most Authentic"
                    ? "bg-green-500/90 text-white"
                    : tag === "Quickest"
                      ? "bg-sky-500/90 text-white"
                      : tag === "Healthiest"
                        ? "bg-emerald-500/90 text-white"
                        : "bg-black/50 text-white"
                )}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Bottom overlay info */}
          <div className="absolute bottom-0 inset-x-0 p-4">
            <h3 className={cn("font-heading text-white leading-tight text-balance", isTop ? "text-2xl" : "text-xl")}>
              {recipe.title}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {recipe.description}
          </p>

          {/* Stats Row */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Stat icon={<Clock className="h-3 w-3" />} value={`${recipe.cookingTime} min`} />
            <Stat icon={<ChefHat className="h-3 w-3" />} value={recipe.difficulty} />
            <Stat icon={<Flame className="h-3 w-3" />} value={`${recipe.calories} cal`} />
            <Stat
              icon={<Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
              value={recipe.rating.toFixed(1)}
              highlight
            />
          </div>

          {/* AI Insight */}
          <div className="mt-3 rounded-xl border border-primary/10 bg-primary/5 p-3">
            <p className="text-xs leading-relaxed text-foreground">
              <span className="font-semibold text-primary">AI Insight: </span>
              {recipe.aiSummary}
            </p>
          </div>

          {/* CTA */}
          <div
            className={cn(
              "mt-3 flex items-center justify-between rounded-xl bg-foreground/5 px-4 py-2.5 transition-colors group-hover:bg-primary/10",
            )}
          >
            <span className="text-sm font-semibold text-foreground">
              {isTop ? "View Best Recipe" : "View Recipe"}
            </span>
            <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

function Stat({
  icon,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  value: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
        highlight ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"
      )}
    >
      {icon}
      {value}
    </span>
  );
}
