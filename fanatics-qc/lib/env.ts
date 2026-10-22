// Demo mode runs the full UI on in-memory sample data, with no external
// services. It is on whenever Supabase is not configured or DEMO_MODE=true.
export function isDemo(): boolean {
  return (
    process.env.DEMO_MODE === "true" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
