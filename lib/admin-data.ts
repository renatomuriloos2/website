import { SupabaseClient } from "@supabase/supabase-js";
import { Client, ParameterRange, AppUser } from "@/types/database";

export async function getAllClients(supabase: SupabaseClient): Promise<Client[]> {
  const { data } = await supabase.from("clients").select("*").order("name");
  return (data ?? []) as Client[];
}

export async function getAllParameterRanges(supabase: SupabaseClient): Promise<ParameterRange[]> {
  const { data } = await supabase.from("parameter_ranges").select("*").order("label");
  return (data ?? []) as ParameterRange[];
}

export async function getAllAppUsers(supabase: SupabaseClient): Promise<AppUser[]> {
  const { data } = await supabase.from("users").select("id, email, role, client_id").order("email");
  return (data ?? []) as AppUser[];
}

export interface RecentVisitRow {
  id: string;
  client_id: string;
  system: string;
  visit_date: string;
  technician: string | null;
  priority: "normal" | "atencion" | "urgente";
  clients: { name: string } | null;
}

export async function getRecentVisits(supabase: SupabaseClient, limit = 10): Promise<RecentVisitRow[]> {
  const { data } = await supabase
    .from("visits")
    .select("id, client_id, system, visit_date, technician, priority, clients(name)")
    .order("visit_date", { ascending: false })
    .limit(limit)
    .returns<RecentVisitRow[]>();
  return data ?? [];
}
