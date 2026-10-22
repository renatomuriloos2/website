import "server-only";
import { isDemo } from "@/lib/env";
import { demoRepo } from "./demo";
import { supabaseRepo } from "./supabase";
import type { Repo } from "./repo";

export function getRepo(): Repo {
  return isDemo() ? demoRepo : supabaseRepo;
}

export * from "./repo";
