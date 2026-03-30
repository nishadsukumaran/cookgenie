/**
 * CookGenie database schema — Drizzle ORM + Neon PostgreSQL.
 *
 * Tables implemented in this phase:
 * - recipes, recipe_ingredients, recipe_steps
 * - saved_recipes, cooking_sessions
 * - substitution_knowledge
 * - ai_interactions (minimal)
 * - rescue_queries
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ═══════════════════════════════════════════
// RECIPES
// ═══════════════════════════════════════════

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    cuisine: text("cuisine").notNull(),
    cookingTime: integer("cooking_time").notNull(),
    prepTime: integer("prep_time").notNull(),
    difficulty: text("difficulty").notNull(),
    rating: numeric("rating", { precision: 2, scale: 1 }).default("0"),
    servings: integer("servings").notNull().default(4),
    calories: integer("calories"),
    tags: text("tags")
      .array()
      .default([]),
    aiSummary: text("ai_summary"),
    sourceUrl: text("source_url"),
    sourceRecipeId: uuid("source_recipe_id"), // for My Recipes: the original recipe it was derived from
    ownerId: text("owner_id"),                // null = system recipe, set = user-owned
    isUserRecipe: boolean("is_user_recipe").default(false),
    isPublished: boolean("is_published").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_recipes_cuisine").on(table.cuisine),
    index("idx_recipes_slug").on(table.slug),
  ]
);

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(recipeIngredients),
  steps: many(recipeSteps),
  savedBy: many(savedRecipes),
  sessions: many(cookingSessions),
}));

// ═══════════════════════════════════════════
// RECIPE INGREDIENTS
// ═══════════════════════════════════════════

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    unit: text("unit").notNull(),
    category: text("category").notNull(),
    sortOrder: integer("sort_order").default(0),
  },
  (table) => [
    index("idx_recipe_ingredients_recipe").on(table.recipeId),
    uniqueIndex("idx_recipe_ingredients_unique").on(table.recipeId, table.name),
  ]
);

export const recipeIngredientsRelations = relations(
  recipeIngredients,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeIngredients.recipeId],
      references: [recipes.id],
    }),
  })
);

// ═══════════════════════════════════════════
// RECIPE STEPS
// ═══════════════════════════════════════════

export const recipeSteps = pgTable(
  "recipe_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    instruction: text("instruction").notNull(),
    duration: integer("duration"),
    tip: text("tip"),
  },
  (table) => [
    index("idx_recipe_steps_recipe").on(table.recipeId),
    uniqueIndex("idx_recipe_steps_unique").on(table.recipeId, table.stepNumber),
  ]
);

export const recipeStepsRelations = relations(recipeSteps, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeSteps.recipeId],
    references: [recipes.id],
  }),
}));

// ═══════════════════════════════════════════
// SAVED RECIPES
// ═══════════════════════════════════════════

export const savedRecipes = pgTable(
  "saved_recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(), // text for now — will be UUID when auth is added
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    notes: text("notes"),
    savedAt: timestamp("saved_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_saved_recipes_unique").on(table.userId, table.recipeId),
    index("idx_saved_recipes_user").on(table.userId),
  ]
);

export const savedRecipesRelations = relations(savedRecipes, ({ one }) => ({
  recipe: one(recipes, {
    fields: [savedRecipes.recipeId],
    references: [recipes.id],
  }),
}));

// ═══════════════════════════════════════════
// COOKING SESSIONS
// ═══════════════════════════════════════════

export const cookingSessions = pgTable(
  "cooking_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").default(1),
    totalSteps: integer("total_steps").notNull(),
    servingsUsed: integer("servings_used").notNull(),
    status: text("status").default("in_progress"), // 'in_progress' | 'completed' | 'abandoned'
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    transformations: jsonb("transformations").default({}),
    rescueUsed: boolean("rescue_used").default(false),
    substitutionsUsed: jsonb("substitutions_used").default([]),
    modificationsApplied: jsonb("modifications_applied").default([]),
  },
  (table) => [
    index("idx_sessions_user").on(table.userId),
    index("idx_sessions_status").on(table.status),
  ]
);

export const cookingSessionsRelations = relations(
  cookingSessions,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [cookingSessions.recipeId],
      references: [recipes.id],
    }),
  })
);

// ═══════════════════════════════════════════
// SUBSTITUTION KNOWLEDGE
// ═══════════════════════════════════════════

export const substitutionKnowledge = pgTable(
  "substitution_knowledge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    original: text("original").notNull(),
    substituteName: text("substitute_name").notNull(),
    tier: text("tier").notNull(), // 'best' | 'fallback'
    quantityRatio: numeric("quantity_ratio", { precision: 4, scale: 2 }).default("1.0"),
    quantityUnit: text("quantity_unit"),
    quantityNote: text("quantity_note"),
    tasteScore: integer("taste_score"),
    tasteNote: text("taste_note"),
    textureScore: integer("texture_score"),
    textureNote: text("texture_note"),
    authScore: integer("auth_score"),
    authNote: text("auth_note"),
    summary: text("summary"),
    source: text("source").default("curated"), // 'curated' | 'ai_learned' | 'community'
    verified: boolean("verified").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_substitutions_unique").on(table.original, table.substituteName),
    index("idx_substitutions_original").on(table.original),
  ]
);

// ═══════════════════════════════════════════
// AI INTERACTIONS (minimal logging)
// ═══════════════════════════════════════════

export const aiInteractions = pgTable(
  "ai_interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    taskType: text("task_type").notNull(), // 'recipe-reasoning' | 'rescue-advice' | etc.
    model: text("model").notNull(), // 'anthropic/claude-sonnet-4.6'
    tier: text("tier").notNull(), // 'primary' | 'validator' | 'arbitrator'
    // Omit full prompt — store only a hash + context summary to save storage
    inputSummary: text("input_summary"), // first 200 chars of user input
    inputContext: jsonb("input_context"), // { recipeName, cuisine, problem } — lightweight
    outputConfidence: numeric("output_confidence", { precision: 3, scale: 2 }),
    outputScenarioType: text("output_scenario_type"), // structured field from response
    latencyMs: integer("latency_ms"),
    wasMock: boolean("was_mock").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_ai_task").on(table.taskType),
    index("idx_ai_model").on(table.model),
    index("idx_ai_created").on(table.createdAt),
  ]
);

// ═══════════════════════════════════════════
// RESCUE QUERIES
// ═══════════════════════════════════════════

/** Structured response stored in rescue_queries.response JSONB column */
export interface RescueQueryResponse {
  fix: {
    title: string;
    instruction: string;
    ingredients?: Array<{ name: string; amount: string }>;
    urgency: "immediate" | "when-ready" | "optional";
  };
  alternatives: Array<{
    title: string;
    instruction: string;
    tradeoff: string;
  }>;
  impact: {
    taste: { direction: string; description: string };
    texture: { direction: string; description: string };
    authenticity: { direction: string; description: string };
  };
  confidence: "high" | "medium" | "low";
  tiersUsed: number;
  guardrailApplied: boolean;
}

export const rescueQueries = pgTable(
  "rescue_queries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    sessionId: uuid("session_id").references(() => cookingSessions.id, {
      onDelete: "set null",
    }),
    recipeId: uuid("recipe_id").references(() => recipes.id, {
      onDelete: "set null",
    }),
    userInput: text("user_input").notNull(),
    detectedIntent: jsonb("detected_intent").notNull(), // { category, subcategory, confidence }
    problemType: text("problem_type"), // 'too-salty', etc.
    hadStructured: boolean("had_structured").default(false),
    response: jsonb("response").$type<RescueQueryResponse>().notNull(),
    userFeedback: text("user_feedback"), // 'helpful' | 'not_helpful'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_rescue_problem").on(table.problemType),
    index("idx_rescue_feedback").on(table.userFeedback),
  ]
);

// ═══════════════════════════════════════════
// RECIPE VARIANTS (saved custom modifications)
// ═══════════════════════════════════════════

/** JSONB shape for ingredient changes in a variant */
export interface VariantChange {
  ingredient: string;
  originalAmount: number;
  newAmount: number;
  unit: string;
  reason: string;
}

/** JSONB shape for trust metrics snapshot */
export interface VariantTrustSnapshot {
  confidence: { score: number; label: string };
  risk: { level: string; reasons: string[] };
  authenticity: { score: number; label: string };
  caloriesBefore: number;
  caloriesAfter: number;
}

export const recipeVariants = pgTable(
  "recipe_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    baseRecipeId: uuid("base_recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    servings: integer("servings").notNull(),
    ingredientChanges: jsonb("ingredient_changes").$type<VariantChange[]>().default([]),
    trustMetrics: jsonb("trust_metrics").$type<VariantTrustSnapshot>(),
    changeSummary: text("change_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_variants_user").on(table.userId),
    index("idx_variants_recipe").on(table.baseRecipeId),
  ]
);

export const recipeVariantsRelations = relations(recipeVariants, ({ one }) => ({
  baseRecipe: one(recipes, {
    fields: [recipeVariants.baseRecipeId],
    references: [recipes.id],
  }),
}));

// ═══════════════════════════════════════════
// USER FEEDBACK
// ═══════════════════════════════════════════

export const userFeedback = pgTable(
  "user_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    targetType: text("target_type").notNull(), // 'rescue' | 'substitution' | 'modification'
    targetId: text("target_id"),               // ID of the rescue_query, etc.
    rating: text("rating").notNull(),          // 'helpful' | 'not_helpful' | 'too_risky' | 'too_different'
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_feedback_type").on(table.targetType),
    index("idx_feedback_rating").on(table.rating),
  ]
);

// ═══════════════════════════════════════════
// USER PREFERENCES
// ═══════════════════════════════════════════

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().unique(),
    spicePreference: text("spice_preference").default("medium"), // 'mild' | 'medium' | 'hot' | 'very_hot'
    dietary: text("dietary").array().default([]),                 // ['no-peanuts', 'vegetarian', 'gluten-free']
    cuisines: text("cuisines").array().default([]),               // ['indian', 'arabic', 'mediterranean']
    calorieGoal: integer("calorie_goal"),                         // daily target, nullable
    authenticityPreference: text("authenticity_preference").default("flexible"), // 'strict' | 'flexible' | 'adventurous'
    unitSystem: text("unit_system").default("metric"),           // 'metric' | 'imperial'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_prefs_user").on(table.userId),
  ]
);
