import { SupabaseClient } from "@supabase/supabase-js";
import { SYSTEMS } from "@/lib/constants";
import { ParameterRange, SystemType, Visit, VisitDosing, VisitReading } from "@/types/database";

export async function getClientSystems(
  supabase: SupabaseClient,
  clientId: string
): Promise<SystemType[]> {
  const { data } = await supabase
    .from("clients")
    .select("active_systems")
    .eq("id", clientId)
    .single();

  const active = (data?.active_systems ?? []) as SystemType[];
  if (active.length > 0) return active;

  // Cliente sin active_systems configurado (datos previos a esta columna):
  // reconstruye a partir de qué sistemas tienen rangos cargados.
  const { data: ranges } = await supabase
    .from("parameter_ranges")
    .select("system")
    .eq("client_id", clientId);

  const found = Array.from(new Set((ranges ?? []).map((r) => r.system as SystemType)));
  return found.length > 0 ? found : SYSTEMS;
}

export async function getParameterRanges(
  supabase: SupabaseClient,
  clientId: string,
  system: SystemType
): Promise<ParameterRange[]> {
  const { data } = await supabase
    .from("parameter_ranges")
    .select("*")
    .eq("client_id", clientId)
    .eq("system", system)
    .order("label");

  return (data ?? []) as ParameterRange[];
}

export async function getVisits(
  supabase: SupabaseClient,
  clientId: string,
  system?: SystemType
): Promise<Visit[]> {
  let query = supabase
    .from("visits")
    .select("*")
    .eq("client_id", clientId)
    .order("visit_date", { ascending: false });

  if (system) query = query.eq("system", system);

  const { data } = await query;
  return (data ?? []) as Visit[];
}

export async function getReadingsForVisits(
  supabase: SupabaseClient,
  visitIds: string[]
): Promise<VisitReading[]> {
  if (visitIds.length === 0) return [];
  const { data } = await supabase
    .from("visit_readings")
    .select("*")
    .in("visit_id", visitIds);

  return (data ?? []) as VisitReading[];
}

export async function getDosingForVisits(
  supabase: SupabaseClient,
  visitIds: string[]
): Promise<VisitDosing[]> {
  if (visitIds.length === 0) return [];
  const { data } = await supabase
    .from("visit_dosing")
    .select("*")
    .in("visit_id", visitIds);

  return (data ?? []) as VisitDosing[];
}
