"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAppUser } from "@/lib/auth";
import { DEFAULT_PARAMETERS, SYSTEMS } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SystemType } from "@/types/database";
import { ActionState, isRedirectError } from "@/lib/action-state";

export type { ActionState };

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseSystems(formData: FormData): SystemType[] {
  const selected = formData.getAll("systems").map(String) as SystemType[];
  const valid = selected.filter((s) => SYSTEMS.includes(s));
  return valid.length > 0 ? valid : SYSTEMS;
}

function defaultRangeRows(clientId: string, systems: SystemType[]) {
  return systems.flatMap((system) =>
    DEFAULT_PARAMETERS[system].map((p) => ({
      client_id: clientId,
      system,
      param_key: p.param_key,
      label: p.label,
      unit: p.unit,
      min_value: null,
      max_value: null,
    }))
  );
}

export async function createClientAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAppUser(["admin", "tecnico"]);
    const supabase = createClient();

    const name = String(formData.get("name") ?? "").trim();
    const location = String(formData.get("location") ?? "").trim() || null;
    if (!name) return { error: "El nombre es obligatorio." };

    const systems = parseSystems(formData);

    const { data: client, error } = await supabase
      .from("clients")
      .insert({ name, location, active_systems: systems })
      .select()
      .single();

    if (error) return { error: error.message };

    const { error: rangesError } = await supabase
      .from("parameter_ranges")
      .insert(defaultRangeRows(client.id, systems));
    if (rangesError) return { error: rangesError.message };

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/rangos");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : "Error inesperado al crear el cliente.";
    return { error: message };
  }

  return { error: null };
}

export async function updateClientAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAppUser(["admin", "tecnico"]);
    const supabase = createClient();

    const name = String(formData.get("name") ?? "").trim();
    const location = String(formData.get("location") ?? "").trim() || null;
    if (!name) return { error: "El nombre es obligatorio." };

    const systems = parseSystems(formData);

    const { data: existingRanges } = await supabase
      .from("parameter_ranges")
      .select("system")
      .eq("client_id", id);
    const systemsWithRanges = new Set((existingRanges ?? []).map((r) => r.system));
    const newlyEnabled = systems.filter((s) => !systemsWithRanges.has(s));

    const { error } = await supabase
      .from("clients")
      .update({ name, location, active_systems: systems })
      .eq("id", id);
    if (error) return { error: error.message };

    if (newlyEnabled.length > 0) {
      const { error: rangesError } = await supabase
        .from("parameter_ranges")
        .insert(defaultRangeRows(id, newlyEnabled));
      if (rangesError) return { error: rangesError.message };
    }

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/rangos");
    revalidatePath("/admin/portal");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : "Error inesperado al guardar el cliente.";
    return { error: message };
  }

  return { error: null };
}

export async function deleteClientAction(
  id: string,
  _prevState: ActionState
): Promise<ActionState> {
  try {
    await requireAppUser(["admin", "tecnico"]);
    const supabase = createClient();

    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/rangos");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : "Error inesperado al eliminar el cliente.";
    return { error: message };
  }

  return { error: null };
}

export async function linkUserAction(formData: FormData) {
  await requireAppUser("admin");
  const supabase = createClient();

  const id = String(formData.get("id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();

  if (!id || !email || !clientId) throw new Error("Faltan datos para vincular el usuario.");

  const { error } = await supabase
    .from("users")
    .upsert({ id, email, role: "client", client_id: clientId });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/clientes");
}

export async function unlinkUserAction(id: string) {
  await requireAppUser("admin");
  const supabase = createClient();

  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/clientes");
}

export async function sendPasswordResetAction(formData: FormData) {
  await requireAppUser("admin");
  const supabase = createClient();

  const email = String(formData.get("email") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "").trim();
  if (!email) throw new Error("Falta el correo del usuario.");

  const host = headers().get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const redirectTo = `${protocol}://${host}/auth/callback`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);

  redirect(`/admin/clientes/${clientId}?reset_sent=${encodeURIComponent(email)}`);
}

export async function upsertRangeAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAppUser(["admin", "tecnico"]);
    const supabase = createClient();

    const id = String(formData.get("id") ?? "").trim() || null;
    const clientId = String(formData.get("client_id") ?? "").trim();
    const system = String(formData.get("system") ?? "").trim() as SystemType;
    const label = String(formData.get("label") ?? "").trim();
    const unit = String(formData.get("unit") ?? "").trim() || null;
    const minRaw = String(formData.get("min_value") ?? "").trim();
    const maxRaw = String(formData.get("max_value") ?? "").trim();
    const min_value = minRaw === "" ? null : Number(minRaw);
    const max_value = maxRaw === "" ? null : Number(maxRaw);

    if (!clientId || !system || !label) return { error: "Faltan datos del parámetro." };

    if (id) {
      const { error } = await supabase
        .from("parameter_ranges")
        .update({ label, unit, min_value, max_value, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return { error: error.message };
    } else {
      const param_key = slugify(label);
      const { error } = await supabase
        .from("parameter_ranges")
        .insert({ client_id: clientId, system, param_key, label, unit, min_value, max_value });
      if (error) return { error: error.message };
    }

    revalidatePath("/admin/rangos");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : "Error inesperado al guardar el parámetro.";
    return { error: message };
  }

  return { error: null };
}

export async function deleteRangeAction(
  id: string,
  _prevState: ActionState
): Promise<ActionState> {
  try {
    await requireAppUser(["admin", "tecnico"]);
    const supabase = createClient();

    const { error } = await supabase.from("parameter_ranges").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin/rangos");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : "Error inesperado al eliminar el parámetro.";
    return { error: message };
  }

  return { error: null };
}

export interface VisitReadingInput {
  param_key: string;
  value: number;
}

export interface VisitDosingInput {
  product: string;
  dose: number | null;
  unit: string | null;
  notes: string | null;
}

export async function createVisitAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAppUser(["admin", "tecnico"]);
    const supabase = createClient();

    const client_id = String(formData.get("client_id") ?? "").trim();
    const system = String(formData.get("system") ?? "").trim() as SystemType;
    const visit_date = String(formData.get("visit_date") ?? "").trim();
    const technician = String(formData.get("technician") ?? "").trim() || null;
    const recommendation = String(formData.get("recommendation") ?? "").trim() || null;
    const priority = String(formData.get("priority") ?? "normal").trim();
    const next_visit_date = String(formData.get("next_visit_date") ?? "").trim() || null;
    const readings = JSON.parse(String(formData.get("readings") ?? "[]")) as VisitReadingInput[];
    const dosing = JSON.parse(String(formData.get("dosing") ?? "[]")) as VisitDosingInput[];

    if (!client_id || !system || !visit_date) {
      return { error: "Faltan datos obligatorios de la visita." };
    }

    const { data: visit, error } = await supabase
      .from("visits")
      .insert({
        client_id,
        system,
        visit_date,
        technician,
        recommendation,
        priority,
        next_visit_date,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    const validReadings = readings.filter((r) => r.param_key && !Number.isNaN(r.value));
    if (validReadings.length > 0) {
      const { error: readingsError } = await supabase
        .from("visit_readings")
        .insert(validReadings.map((r) => ({ visit_id: visit.id, param_key: r.param_key, value: r.value })));
      if (readingsError) return { error: readingsError.message };
    }

    const validDosing = dosing.filter((d) => d.product);
    if (validDosing.length > 0) {
      const { error: dosingError } = await supabase.from("visit_dosing").insert(
        validDosing.map((d) => ({
          visit_id: visit.id,
          product: d.product,
          dose: d.dose,
          unit: d.unit,
          notes: d.notes,
        }))
      );
      if (dosingError) return { error: dosingError.message };
    }

    revalidatePath("/portal");
    revalidatePath("/admin");
    revalidatePath("/admin/visitas");
    redirect("/admin/visitas?created=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : "Error inesperado al registrar la visita.";
    return { error: message };
  }
}

export async function updateVisitAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAppUser(["admin", "tecnico"]);
    const supabase = createClient();

    const visit_date = String(formData.get("visit_date") ?? "").trim();
    const technician = String(formData.get("technician") ?? "").trim() || null;
    const recommendation = String(formData.get("recommendation") ?? "").trim() || null;
    const priority = String(formData.get("priority") ?? "normal").trim();
    const next_visit_date = String(formData.get("next_visit_date") ?? "").trim() || null;

    if (!visit_date) return { error: "La fecha de visita es obligatoria." };

    const { error } = await supabase
      .from("visits")
      .update({ visit_date, technician, recommendation, priority, next_visit_date })
      .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/portal");
    revalidatePath("/admin");
    revalidatePath("/admin/visitas");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : "Error inesperado al guardar la visita.";
    return { error: message };
  }

  return { error: null };
}

export async function deleteVisitAction(
  id: string,
  _prevState: ActionState
): Promise<ActionState> {
  try {
    await requireAppUser(["admin", "tecnico"]);
    const supabase = createClient();

    const { error } = await supabase.from("visits").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/portal");
    revalidatePath("/admin");
    revalidatePath("/admin/visitas");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : "Error inesperado al eliminar la visita.";
    return { error: message };
  }

  return { error: null };
}
