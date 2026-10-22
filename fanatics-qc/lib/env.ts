import { cookies } from "next/headers";

// Two ways to run:
//  • Real mode — Supabase configured: real users, MFA, data saved permanently.
//  • Demo mode — in-memory synthetic data with one-click logins; never touches the database.
// When Supabase is configured, visitors can still switch to the demo from the login screen
// (cookie fx_mode=demo). Set DEMO_SWITCH=false to hide that option in production.

export const MODE_COOKIE = "fx_mode";

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** True when the visitor may toggle between the real system and the demo. */
export function canSwitchMode(): boolean {
  return supabaseConfigured() && process.env.DEMO_MODE !== "true" && process.env.DEMO_SWITCH !== "false";
}

export function isDemo(): boolean {
  if (process.env.DEMO_MODE === "true" || !supabaseConfigured()) return true;
  if (!canSwitchMode()) return false;
  try {
    return cookies().get(MODE_COOKIE)?.value === "demo";
  } catch {
    return false;
  }
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
