/**
 * Server-side session helper.
 *
 * Usage:
 *   const session = await getServerSession();
 *   if (!session?.user) { /* not logged in *\/ }
 */

import { cache } from "react";
import { auth } from "@/lib/auth/auth";

export const getServerSession = cache(async () => {
  return auth();
});

/**
 * Get the authenticated user ID from the server session.
 * Returns null if not logged in.
 */
export const getUserId = cache(async (): Promise<string | null> => {
  const session = await getServerSession();
  return session?.user?.id ?? null;
});
