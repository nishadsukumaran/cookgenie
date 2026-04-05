/**
 * Auth.js API route — handles all authentication flows.
 *
 * Mounted at /api/auth/*
 * - GET/POST /api/auth/signin/google — Google OAuth
 * - GET/POST /api/auth/signout — Sign out
 * - GET /api/auth/session — Get current session
 * - GET /api/auth/csrf — CSRF token
 */

import { handlers } from "@/lib/auth/auth";

export const { GET, POST } = handlers;
