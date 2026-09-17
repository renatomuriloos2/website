import { SupabaseClient } from "@supabase/supabase-js";
import { Client, ParameterRange, AppUser, Visit, VisitDosing, VisitReading } from "@/types/database";

export async function getAllClients(supabase: SupabaseClient): Promise<Client[]> {
  const { data } = await supabase.from("clients").select("*").order("name");
  return (data ?? []) as Client[];
}

export async function getAllParameterRanges(supabase: SupabaseClient): Promise<ParameterRange[]> {
  const { data } = await supabase.from("parameter_ranges").select("*").order("label");
  return (data ?? []) as ParameterRange[];
}

interface UserClientRow {
  id: string;
  email: string;
  role: AppUser["role"];
  user_clients: { clients: { id: string; name: string } | null }[];
}

function toAppUserWithClients(row: UserClientRow): AppUserWithClients {
  const clients = row.user_clients.map((uc) => uc.clients).filter((c): c is { id: string; name: string } => c !== null);
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    client_ids: clients.map((c) => c.id),
    clients,
  };
}

export async function getAllAppUsers(supabase: SupabaseClient): Promise<AppUserWithClients[]> {
  const { data } = await supabase
    .from("users")
    .select("id, email, role, user_clients(clients(id, name))")
    .order("email")
    .returns<UserClientRow[]>();
  return (data ?? []).map(toAppUserWithClients);
}

export interface AppUserWithClients extends AppUser {
  clients: { id: string; name: string }[];
}

export async function getAllAppUsersWithClients(
  supabase: SupabaseClient
): Promise<AppUserWithClients[]> {
  return getAllAppUsers(supabase);
}

export async function getAppUserById(
  supabase: SupabaseClient,
  id: string
): Promise<AppUserWithClients | null> {
  const { data } = await supabase
    .from("users")
    .select("id, email, role, user_clients(clients(id, name))")
    .eq("id", id)
    .single<UserClientRow>();
  return data ? toAppUserWithClients(data) : null;
}

export async function getUserCountsByClient(supabase: SupabaseClient): Promise<Map<string, number>> {
  const { data } = await supabase.from("user_clients").select("client_id");
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.client_id, (counts.get(row.client_id) ?? 0) + 1);
  }
  return counts;
}

export async function getTecnicoUsers(supabase: SupabaseClient): Promise<{ id: string; email: string }[]> {
  const { data } = await supabase.from("users").select("id, email").eq("role", "tecnico").order("email");
  return data ?? [];
}

export async function getLinkedUsersForClient(
  supabase: SupabaseClient,
  clientId: string
): Promise<{ id: string; email: string }[]> {
  const { data } = await supabase
    .from("users")
    .select("id, email, user_clients!inner(client_id)")
    .eq("user_clients.client_id", clientId)
    .order("email");
  return (data ?? []).map((u) => ({ id: u.id, email: u.email }));
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

export interface VisitWithDetails extends Visit {
  clients: { name: string } | null;
  visit_readings: VisitReading[];
  visit_dosing: VisitDosing[];
}

export async function getVisitWithDetails(
  supabase: SupabaseClient,
  id: string
): Promise<VisitWithDetails | null> {
  const { data } = await supabase
    .from("visits")
    .select("*, clients(name), visit_readings(*), visit_dosing(*)")
    .eq("id", id)
    .single();
  return (data as VisitWithDetails | null) ?? null;
}
