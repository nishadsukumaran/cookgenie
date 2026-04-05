"use client";

/**
 * Client-side session hook.
 *
 * Usage:
 *   const { data: session, status } = useSession();
 *   const isLoading = status === "loading";
 *   const isLoggedIn = status === "authenticated";
 */

export { useSession, signIn, signOut } from "next-auth/react";
