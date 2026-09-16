import { SystemType } from "@/types/database";

export const SYSTEMS: SystemType[] = ["Calderas", "Enfriamiento", "Vapor", "PTAR"];

export const PRIORITY_LABELS: Record<string, string> = {
  normal: "Normal",
  atencion: "Atención",
  urgente: "Urgente",
};

export interface DefaultParam {
  param_key: string;
  label: string;
  unit: string | null;
}

export const DEFAULT_PARAMETERS: Record<SystemType, DefaultParam[]> = {
  Calderas: [
    { param_key: "ph", label: "pH", unit: null },
    { param_key: "alcalinidad_total", label: "Alcalinidad total", unit: "ppm CaCO3" },
    { param_key: "dureza_total", label: "Dureza total", unit: "ppm CaCO3" },
    { param_key: "tds", label: "Sólidos disueltos (TDS)", unit: "ppm" },
    { param_key: "silice", label: "Sílice", unit: "ppm SiO2" },
    { param_key: "sulfito_residual", label: "Sulfito residual", unit: "ppm" },
  ],
  Enfriamiento: [
    { param_key: "ph", label: "pH", unit: null },
    { param_key: "conductividad", label: "Conductividad", unit: "µS/cm" },
    { param_key: "dureza_calcica", label: "Dureza cálcica", unit: "ppm CaCO3" },
    { param_key: "ciclos_concentracion", label: "Ciclos de concentración", unit: null },
    { param_key: "cloro_residual_libre", label: "Cloro residual libre", unit: "ppm" },
    { param_key: "hierro_total", label: "Hierro total", unit: "ppm" },
  ],
  Vapor: [
    { param_key: "ph_condensado", label: "pH de condensado", unit: null },
    { param_key: "hierro_condensado", label: "Hierro en condensado", unit: "ppm" },
    { param_key: "conductividad_condensado", label: "Conductividad de condensado", unit: "µS/cm" },
    { param_key: "oxigeno_disuelto", label: "Oxígeno disuelto", unit: "ppb" },
  ],
  PTAR: [
    { param_key: "ph_efluente", label: "pH efluente", unit: null },
    { param_key: "dqo", label: "DQO", unit: "ppm" },
    { param_key: "solidos_suspendidos", label: "Sólidos suspendidos totales", unit: "ppm" },
    { param_key: "color", label: "Color", unit: "Pt-Co" },
    { param_key: "grasas_aceites", label: "Grasas y aceites", unit: "ppm" },
  ],
};
