'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, Layers, ShieldCheck, Clock, Search, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { AppHeader } from '@/components/layout/app-header'
import { RecipeCard } from '@/components/recipe/recipe-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Recipe } from '@/data/mock-data'

interface SavedVariant {
  id: string
  name: string
  servings: number
  changeSummary: string | null
  createdAt: string
  trustMetrics: {
    confidence: { score: number; label: string }
    authenticity: { score: number; label: string }
    caloriesBefore: number
    caloriesAfter: number
  } | null
  baseRecipeId: string
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export default function SavedPage() {
  const [tab, setTab] = useState<'recipes' | 'versions'>('recipes')
  const [searchQuery, setSearchQuery] = useState('')
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([])
  const [loadingRecipes, setLoadingRecipes] = useState(true)
  const [variants, setVariants] = useState<SavedVariant[]>([])
  const [loadingVariants, setLoadingVariants] = useState(false)

  useEffect(() => {
    setLoadingRecipes(true)
    fetch('/api/saved')
      .then((r) => r.json())
      .then((data) => setSavedRecipes(data.savedRecipes ?? []))
      .catch(() => {})
      .finally(() => setLoadingRecipes(false))
  }, [])

  useEffect(() => {
    if (tab === 'versions' && variants.length === 0) {
      setLoadingVariants(true)
      fetch('/api/variants')
        .then((r) => r.json())
        .then((data) => setVariants(data.variants ?? []))
        .catch(() => {})
        .finally(() => setLoadingVariants(false))
    }
  }, [tab, variants.length])

  const filteredRecipes = savedRecipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title="Saved" />

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setTab('recipes')
              setSearchQuery('')
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200',
              tab === 'recipes'
                ? 'bg-primary text-white shadow-card'
                : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-raised'
            )}
          >
            <Bookmark className="w-4 h-4" />
            Recipes
          </button>
          <button
            onClick={() => setTab('versions')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200',
              tab === 'versions'
                ? 'bg-primary text-white shadow-card'
                : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-raised'
            )}
          >
            <Layers className="w-4 h-4" />
            My Versions
          </button>
        </div>

        {/* Saved Recipes Tab */}
        {tab === 'recipes' && (
          <div>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search saved recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-surface border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {loadingRecipes ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredRecipes.length > 0 ? (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                <motion.p
                  variants={fadeUp}
                  className="text-sm text-muted-foreground mb-3"
                >
                  {filteredRecipes.length} of {savedRecipes.length} recipes
                </motion.p>
                {filteredRecipes.map((recipe) => (
                  <motion.div key={recipe.id} variants={fadeUp}>
                    <RecipeCard recipe={recipe} variant="compact" />
                  </motion.div>
                ))}
              </motion.div>
            ) : searchQuery ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No recipes match your search</p>
              </div>
            ) : (
              <EmptyState
                icon={Bookmark}
                title="No saved recipes"
                description="Tap the bookmark icon on any recipe to save it here"
                action={
                  <Link href="/search">
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                      Browse recipes
                    </Button>
                  </Link>
                }
              />
            )}
          </div>
        )}

        {/* My Versions Tab */}
        {tab === 'versions' && (
          <div>
            {loadingVariants ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : variants.length > 0 ? (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                <motion.p
                  variants={fadeUp}
                  className="text-sm text-muted-foreground mb-3"
                >
                  {variants.length} custom version{variants.length !== 1 ? 's' : ''}
                </motion.p>
                {variants.map((variant) => (
                  <motion.div key={variant.id} variants={fadeUp}>
                    <VariantCard variant={variant} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={Layers}
                title="No saved versions"
                description="Modify a recipe's servings or calories, then tap save to create your own version"
                action={
                  <Link href="/recipe/butter-chicken">
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                      Try modifying a recipe
                    </Button>
                  </Link>
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function VariantCard({ variant }: { variant: SavedVariant }) {
  const trust = variant.trustMetrics
  const calSaved = trust ? trust.caloriesBefore - trust.caloriesAfter : 0

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card hover:shadow-card-hover transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{variant.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {variant.servings} servings
            {calSaved > 0 && ` · ${calSaved} cal saved/serving`}
          </p>
        </div>
        {trust && (
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            {trust.authenticity.score}%
          </div>
        )}
      </div>

      {variant.changeSummary && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {variant.changeSummary}
        </p>
      )}

      {trust && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground">
            {trust.authenticity.label}
          </span>
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground">
            {trust.confidence.score}% confident
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        {new Date(variant.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
}
