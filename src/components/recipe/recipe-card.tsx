"use client"

import Link from "next/link"
import Image from "next/image"
import { Clock, Star, Flame, ChefHat } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import type { Recipe } from "@/data/mock-data"

interface RecipeCardProps {
  recipe: Recipe
  variant?: "default" | "compact" | "featured"
  showAiSummary?: boolean
  priority?: boolean
  className?: string
}

export function RecipeCard({
  recipe,
  variant = "default",
  showAiSummary = false,
  priority = false,
  className,
}: RecipeCardProps) {
  if (variant === "compact") {
    return (
      <Link href={`/recipe/${recipe.id}`}>
        <motion.div
          whileTap={{ scale: 0.98 }}
          className={cn(
            "group flex gap-3 rounded-lg border border-border bg-card p-3 shadow-card hover:shadow-card-hover transition-all duration-300",
            className
          )}
        >
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image
              src={recipe.image || "/images/placeholder.jpg"}
              alt={recipe.title}
              fill
              sizes="80px"
              priority={priority}
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-1.5 overflow-hidden">
            <h3 className="truncate font-semibold text-sm text-foreground">{recipe.title}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Clock className="h-3.5 w-3.5" />
                {`${recipe.cookingTime}m`}
              </span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-0.5">
                <Star className="h-3.5 w-3.5 fill-amber text-primary" />
                {recipe.rating}
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    )
  }

  if (variant === "featured") {
    return (
      <Link href={`/recipe/${recipe.id}`}>
        <motion.div
          whileTap={{ scale: 0.98 }}
          className={cn(
            "group relative overflow-hidden rounded-xl border border-border bg-card shadow-card hover:shadow-float transition-all duration-300",
            className
          )}
        >
          <div className="relative h-48 w-full bg-surface overflow-hidden">
            <Image
              src={recipe.image || "/images/placeholder.jpg"}
              alt={recipe.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority}
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 image-overlay-bottom" />
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              {recipe.tags?.slice(0, 2).map((tag) => (
                <Badge
                  key={tag}
                  className="bg-background/90 backdrop-blur-sm text-xs font-medium text-foreground"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-heading text-lg font-bold text-foreground">{recipe.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {recipe.description || recipe.cuisine}
            </p>
            <div className="mt-4 flex items-center gap-2 flex-wrap text-sm">
              <RecipeStatPill icon={<Clock className="h-3.5 w-3.5" />} value={`${recipe.cookingTime}m`} />
              <RecipeStatPill icon={<Flame className="h-3.5 w-3.5" />} value={`${recipe.servings} servings`} />
              <RecipeStatPill icon={<Star className="h-3.5 w-3.5 fill-primary text-primary" />} value={recipe.rating.toString()} />
            </div>
            {showAiSummary && (
              <div className="mt-3 rounded-lg bg-accent/80 p-3 text-xs text-foreground">
                <span className="font-semibold text-primary">AI: </span>
                {recipe.description?.substring(0, 80)}...
              </div>
            )}
          </div>
        </motion.div>
      </Link>
    )
  }

  // Default variant
  return (
    <Link href={`/recipe/${recipe.id}`}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group overflow-hidden rounded-lg border border-border bg-card shadow-card hover:shadow-card-hover transition-all duration-300",
          className
        )}
      >
        <div className="relative h-40 w-full bg-surface overflow-hidden">
          <Image
            src={recipe.image || "/images/placeholder.jpg"}
            alt={recipe.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={priority}
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {recipe.tags?.[0] && (
            <Badge
              className="absolute top-2.5 left-2.5 bg-background/90 backdrop-blur-sm text-xs font-medium text-foreground"
            >
              {recipe.tags[0]}
            </Badge>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-sm text-foreground">{recipe.title}</h3>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-0.5">
              <Clock className="h-3.5 w-3.5" />
              {`${recipe.cookingTime}m`}
            </span>
            <span className="text-border">·</span>
            <span>{recipe.cuisine}</span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-0.5">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              {recipe.rating}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

function RecipeStatPill({
  icon,
  value,
}: {
  icon: React.ReactNode
  value: string
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-foreground">
      {icon}
      {value}
    </span>
  )
}
