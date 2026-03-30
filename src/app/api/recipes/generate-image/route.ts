/**
 * POST /api/recipes/generate-image
 *
 * Generates a professional food photo using Gemini's multimodal image
 * generation, uploads to Vercel Blob, and updates the recipe's image_url
 * in the database.
 *
 * Body: { recipeTitle: string, cuisine: string }
 * Returns: { imageUrl: string, slug: string } or { imageUrl: null, error: string }
 */

import { NextResponse } from "next/server";
import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export async function POST(req: Request) {
  const body = await req.json();
  const { recipeTitle, cuisine } = body as {
    recipeTitle: string;
    cuisine: string;
  };

  if (!recipeTitle?.trim()) {
    return NextResponse.json(
      { imageUrl: null, error: "recipeTitle is required" },
      { status: 400 }
    );
  }

  // Build a URL-friendly slug from the title
  const slug = recipeTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  try {
    // --- Generate the image via Gemini multimodal ---
    const prompt = `A professional food photograph of ${recipeTitle}, ${cuisine ?? "International"} cuisine. Overhead shot, natural lighting, on a clean plate, appetizing, restaurant quality. No text or watermarks.`;

    const result = await generateText({
      model: gateway("google/gemini-3.1-flash-image-preview"),
      prompt,
    });

    const imageFile = result.files?.[0];
    if (!imageFile) {
      return NextResponse.json(
        { imageUrl: null, error: "AI model did not return an image file" },
        { status: 502 }
      );
    }

    // --- Upload to Vercel Blob ---
    const imageBuffer = Buffer.from(imageFile.base64, "base64");
    const blob = await put(`recipes/${slug}.jpg`, imageBuffer, {
      access: "public",
      contentType: imageFile.mediaType ?? "image/jpeg",
    });

    // --- Update recipe in the database ---
    const db = getDb();
    await db
      .update(schema.recipes)
      .set({ imageUrl: blob.url, updatedAt: new Date() })
      .where(eq(schema.recipes.slug, slug));

    return NextResponse.json({ imageUrl: blob.url, slug });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during image generation";
    console.error(`[generate-image] Failed for "${recipeTitle}":`, message);

    return NextResponse.json(
      { imageUrl: null, error: message },
      { status: 500 }
    );
  }
}
