/**
 * Database connection for CookGenie.
 *
 * Uses Neon serverless driver with Drizzle ORM.
 * Connection is lazy-initialized on first use.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Run `vercel env pull .env.local` or set it in .env.local"
    );
  }
  return url;
}

/**
 * Drizzle database instance — lazy singleton.
 * Safe to import anywhere; connection only opens on first query.
 */
export function getDb() {
  const sql = neon(getConnectionString());
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof getDb>;
