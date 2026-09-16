"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAppUser } from "@/lib/auth";
import { DEFAULT_PARAMETERS, SYSTEMS } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { Priority, SystemType } from "@/types/database";

const DEMO_PREFIX = "[Demo] ";

const DEMO_CLIENTS = [
  { name: `${DEMO_PREFIX}Textilera Elcatex`, location: "San Pedro Sula, Honduras" },
  { name: `${DEMO_PREFIX}Hotel Las Brisas`, location: "Roatán, Honduras" },
  { name: `${DEMO_PREFIX}Planta San Rafael`, location: "Tegucigalpa, Honduras" },
];

const DEMO_RANGES: Record<SystemType, Record<string, { min: number; max: number }>> = {
  Calderas: {
    ph: { min: 10.5, max: 11.5 },
    alcalinidad_total: { min: 200, max: 700 },
    dureza_total: { min: 0, max: 5 },
    tds: { min: 0, max: 3500 },
    silice: { min: 0, max: 150 },
    sulfito_residual: { min: 20, max: 40 },
  },
  Enfriamiento: {
    ph: { min: 7, max: 8.5 },
    conductividad: { min: 1500, max: 3000 },
    dureza_calcica: { min: 200, max: 800 },
    ciclos_concentracion: { min: 3, max: 6 },
    cloro_residual_libre: { min: 0.5, max: 2 },
    hierro_total: { min: 0, max: 2 },
  },
  Vapor: {
    ph_condensado: { min: 8, max: 9.5 },
    hierro_condensado: { min: 0, max: 0.1 },
    conductividad_condensado: { min: 0, max: 30 },
    oxigeno_disuelto: { min: 0, max: 20 },
  },
  PTAR: {
    ph_efluente: { min: 6, max: 9 },
    dqo: { min: 0, max: 150 },
    solidos_suspendidos: { min: 0, max: 100 },
    color: { min: 0, max: 75 },
    grasas_aceites: { min: 0, max: 15 },
  },
};

const RECOMMENDATIONS: Record<Priority, string[]> = {
  normal: [
    "Parámetros estables. Continuar con el programa de tratamiento actual.",
    "Sin novedades. Próximo control de rutina según lo programado.",
  ],
  atencion: [
    "Tendencia al alza en dureza. Ajustar dosificación de anti-incrustante y monitorear de cerca.",
    "Conductividad por encima de lo habitual. Revisar purga y ciclos de concentración.",
  ],
  urgente: [
    "Parámetro fuera de rango óptimo. Se requiere ajuste inmediato de dosificación y nueva visita en 7 días.",
  ],
};

const DOSING_PRODUCTS = [
  { product: "Anti-incrustante RK-200", unit: "ppm" },
  { product: "Secuestrante de oxígeno RK-410", unit: "ppm" },
  { product: "Biocida oxidante RK-750", unit: "ppm" },
  { product: "Ajustador de pH RK-110", unit: "L" },
];

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function valueNear(min: number, max: number, position: number): number {
  const v = min + (max - min) * position;
  return Math.round(v * 100) / 100;
}

export async function seedDemoDataAction() {
  await requireAppUser("admin");
  const supabase = createClient();

  for (const [clientIndex, demoClient] of DEMO_CLIENTS.entries()) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert(demoClient)
      .select()
      .single();

    if (clientError) throw new Error(clientError.message);

    const rangeRows = SYSTEMS.flatMap((system) =>
      DEFAULT_PARAMETERS[system].map((p) => {
        const range = DEMO_RANGES[system][p.param_key];
        return {
          client_id: client.id,
          system,
          param_key: p.param_key,
          label: p.label,
          unit: p.unit,
          min_value: range?.min ?? null,
          max_value: range?.max ?? null,
        };
      })
    );
    const { error: rangesError } = await supabase.from("parameter_ranges").insert(rangeRows);
    if (rangesError) throw new Error(rangesError.message);

    const demoSystems: SystemType[] = ["Calderas", "Enfriamiento"];
    const nextVisitOffsets = [-5, 7, 30]; // vencido / próximo / programado, por cliente

    for (const system of demoSystems) {
      const visitDates = [60, 20];
      for (const [visitIndex, ago] of visitDates.entries()) {
        const isLatest = visitIndex === visitDates.length - 1;
        const priority: Priority =
          clientIndex === 0 && system === "Calderas" && isLatest
            ? "urgente"
            : clientIndex === 1 && isLatest
              ? "atencion"
              : "normal";
        const options = RECOMMENDATIONS[priority];
        const recommendation = options[visitIndex % options.length];

        const { data: visit, error: visitError } = await supabase
          .from("visits")
          .insert({
            client_id: client.id,
            system,
            visit_date: daysAgo(ago),
            technician: "Equipo Rethink",
            recommendation,
            priority,
            next_visit_date: isLatest
              ? daysAgo(-nextVisitOffsets[clientIndex % nextVisitOffsets.length])
              : null,
          })
          .select()
          .single();

        if (visitError) throw new Error(visitError.message);

        const params = DEFAULT_PARAMETERS[system];
        const readings = params.map((p, i) => {
          const range = DEMO_RANGES[system][p.param_key];
          if (!range) return null;
          const outOfRange = priority === "urgente" && isLatest && i === 0;
          const position = outOfRange ? 1.15 : 0.3 + (i % 3) * 0.2;
          return {
            visit_id: visit.id,
            param_key: p.param_key,
            value: valueNear(range.min, range.max, position),
          };
        });
        const validReadings = readings.filter((r): r is NonNullable<typeof r> => r !== null);
        if (validReadings.length > 0) {
          const { error: readingsError } = await supabase
            .from("visit_readings")
            .insert(validReadings);
          if (readingsError) throw new Error(readingsError.message);
        }

        const dosing = DOSING_PRODUCTS.slice(visitIndex, visitIndex + 2).map((d) => ({
          visit_id: visit.id,
          product: d.product,
          dose: valueNear(5, 25, 0.5),
          unit: d.unit,
          notes: null,
        }));
        if (dosing.length > 0) {
          const { error: dosingError } = await supabase.from("visit_dosing").insert(dosing);
          if (dosingError) throw new Error(dosingError.message);
        }
      }
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/rangos");
  revalidatePath("/portal");
}

export async function clearDemoDataAction() {
  await requireAppUser("admin");
  const supabase = createClient();

  const { error } = await supabase.from("clients").delete().like("name", `${DEMO_PREFIX}%`);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/rangos");
  revalidatePath("/portal");
}
