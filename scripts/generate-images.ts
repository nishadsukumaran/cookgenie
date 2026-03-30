/**
 * Generate AI food images for all recipes that are missing one.
 *
 * Usage (requires dev server running on localhost:3000):
 *   npx dotenv -e .env.local -- npx tsx scripts/generate-images.ts
 *
 * Alternatively, set BASE_URL to target a deployed environment:
 *   BASE_URL=https://cookgenie.vercel.app npx dotenv -e .env.local -- npx tsx scripts/generate-images.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { isNull } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL not set. Run: npx dotenv -e .env.local -- npx tsx scripts/generate-images.ts"
    );
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  // Fetch recipes that have no image_url
  const recipesWithoutImages = await db
    .select({
      id: schema.recipes.id,
      slug: schema.recipes.slug,
      title: schema.recipes.title,
      cuisine: schema.recipes.cuisine,
      imageUrl: schema.recipes.imageUrl,
    })
    .from(schema.recipes)
    .where(isNull(schema.recipes.imageUrl));

  if (recipesWithoutImages.length === 0) {
    console.log("All recipes already have images. Nothing to do.");
    return;
  }

  console.log(
    `Found ${recipesWithoutImages.length} recipe(s) without images:\n`
  );

  let success = 0;
  let failed = 0;

  for (const recipe of recipesWithoutImages) {
    const label = `[${success + failed + 1}/${recipesWithoutImages.length}]`;
    console.log(`${label} Generating image for "${recipe.title}" (${recipe.cuisine})...`);

    try {
      const res = await fetch(`${BASE_URL}/api/recipes/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeTitle: recipe.title,
          cuisine: recipe.cuisine,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.imageUrl) {
        console.error(`  FAILED: ${data.error ?? `HTTP ${res.status}`}`);
        failed++;
        continue;
      }

      console.log(`  Done -> ${data.imageUrl}`);
      success++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  FAILED: ${msg}`);
      failed++;
    }
  }

  console.log(`\nFinished: ${success} succeeded, ${failed} failed.`);
}

main();
