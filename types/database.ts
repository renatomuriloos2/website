export type SystemType = "Calderas" | "Enfriamiento" | "Vapor" | "PTAR";

export type Priority = "normal" | "atencion" | "urgente";

export type Role = "admin" | "tecnico" | "client";

export interface Client {
  id: string;
  name: string;
  location: string | null;
  active_systems: SystemType[];
  created_at: string;
}

export interface ParameterRange {
  id: string;
  client_id: string;
  system: SystemType;
  param_key: string;
  label: string;
  unit: string | null;
  min_value: number | null;
  max_value: number | null;
  updated_at: string;
}

export interface Visit {
  id: string;
  client_id: string;
  system: SystemType;
  visit_date: string;
  technician: string | null;
  technician_id: string | null;
  recommendation: string | null;
  priority: Priority;
  next_visit_date: string | null;
  reminder_sent_at: string | null;
  created_at: string;
}

export interface VisitReading {
  id: string;
  visit_id: string;
  param_key: string;
  value: number;
}

export interface VisitDosing {
  id: string;
  visit_id: string;
  product: string;
  dose: number | null;
  unit: string | null;
  notes: string | null;
}

export interface AppUser {
  id: string;
  email: string;
  role: Role;
  client_ids: string[];
}
