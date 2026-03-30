/**
 * Seed script — populates Neon database from mock data.
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx scripts/seed.ts
 *
 * Idempotent: uses ON CONFLICT DO NOTHING for recipes,
 * clears and re-inserts ingredients/steps/substitutions.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

// Import mock data (relative to project root when run with tsx)
import { recipes as mockRecipes } from "../src/data/mock-data";
import { SUBSTITUTION_DB } from "../src/lib/engines/substitution/substitution-db";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL not set. Run: npx dotenv -e .env.local -- npx tsx scripts/seed.ts");
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  console.log("🌱 Seeding CookGenie database...\n");

  // ─── Recipes ──────────────────────────────────────
  for (const recipe of mockRecipes) {
    console.log(`  📖 ${recipe.title}`);

    // Upsert recipe
    const [inserted] = await db
      .insert(schema.recipes)
      .values({
        slug: recipe.id,
        title: recipe.title,
        description: recipe.description,
        imageUrl: recipe.image,
        cuisine: recipe.cuisine,
        cookingTime: recipe.cookingTime,
        prepTime: recipe.prepTime,
        difficulty: recipe.difficulty,
        rating: recipe.rating.toString(),
        servings: recipe.servings,
        calories: recipe.calories,
        tags: recipe.tags,
        aiSummary: recipe.aiSummary,
      })
      .onConflictDoUpdate({
        target: schema.recipes.slug,
        set: {
          title: recipe.title,
          description: recipe.description,
          cuisine: recipe.cuisine,
          cookingTime: recipe.cookingTime,
          prepTime: recipe.prepTime,
          difficulty: recipe.difficulty,
          rating: recipe.rating.toString(),
          servings: recipe.servings,
          calories: recipe.calories,
          tags: recipe.tags,
          aiSummary: recipe.aiSummary,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.recipes.id });

    const recipeId = inserted.id;

    // Clear existing ingredients and steps for this recipe
    await db
      .delete(schema.recipeIngredients)
      .where(eq(schema.recipeIngredients.recipeId, recipeId));
    await db
      .delete(schema.recipeSteps)
      .where(eq(schema.recipeSteps.recipeId, recipeId));

    // Insert ingredients
    if (recipe.ingredients.length > 0) {
      await db.insert(schema.recipeIngredients).values(
        recipe.ingredients.map((ing, i) => ({
          recipeId,
          name: ing.name,
          amount: ing.amount.toString(),
          unit: ing.unit,
          category: ing.category,
          sortOrder: i,
        }))
      );
    }

    // Insert steps
    if (recipe.steps.length > 0) {
      await db.insert(schema.recipeSteps).values(
        recipe.steps.map((step) => ({
          recipeId,
          stepNumber: step.number,
          instruction: step.instruction,
          duration: step.duration ?? null,
          tip: step.tip ?? null,
        }))
      );
    }

    console.log(
      `     ✓ ${recipe.ingredients.length} ingredients, ${recipe.steps.length} steps`
    );
  }

  // ─── Substitution Knowledge ───────────────────────
  console.log("\n  🔄 Substitution knowledge...");

  for (const entry of SUBSTITUTION_DB) {
    for (const sub of entry.substitutes) {
      await db
        .insert(schema.substitutionKnowledge)
        .values({
          original: entry.original,
          substituteName: sub.name,
          tier: sub.tier,
          quantityRatio: sub.quantityMapping.ratio.toString(),
          quantityUnit: sub.quantityMapping.unit ?? null,
          quantityNote: sub.quantityMapping.note ?? null,
          tasteScore: sub.impact.taste.score,
          tasteNote: sub.impact.taste.description,
          textureScore: sub.impact.texture.score,
          textureNote: sub.impact.texture.description,
          authScore: sub.impact.authenticity.score,
          authNote: sub.impact.authenticity.description,
          summary: sub.impact.summary,
          source: "curated",
          verified: true,
        })
        .onConflictDoUpdate({
          target: [
            schema.substitutionKnowledge.original,
            schema.substitutionKnowledge.substituteName,
          ],
          set: {
            tier: sub.tier,
            quantityRatio: sub.quantityMapping.ratio.toString(),
            tasteScore: sub.impact.taste.score,
            textureScore: sub.impact.texture.score,
            authScore: sub.impact.authenticity.score,
            summary: sub.impact.summary,
            updatedAt: new Date(),
          },
        });
    }
  }

  console.log(`     ✓ ${SUBSTITUTION_DB.length} ingredients, ${SUBSTITUTION_DB.reduce((n, e) => n + e.substitutes.length, 0)} substitutes`);

  console.log("\n✅ Seed complete!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
