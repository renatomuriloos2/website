// CAPA (corrective & preventive action) state machine — pure and shared by the
// demo and Supabase repositories.
//
//   open ──supplier submits──▶ submitted ──Fanatics accepts──▶ accepted ──retest approved / staff──▶ closed
//     ▲                            │
//     └──── returned ◀──Fanatics returns (needs more work)

import type { Capa, CapaStatus } from "./types";
import type { CapaAction } from "@/lib/data/repo";

export class CapaTransitionError extends Error {}

export const CAPA_STATUS: Record<CapaStatus, { en: string; es: string; tone: "info" | "warn" | "ok" | "neutral" | "violet" | "amber" | "bad" }> = {
  open: { en: "Open — awaiting supplier", es: "Abierta — espera al proveedor", tone: "warn" },
  submitted: { en: "Submitted — Fanatics review", es: "Enviada — revisión Fanatics", tone: "info" },
  returned: { en: "Returned — needs more work", es: "Devuelta — requiere ajustes", tone: "bad" },
  accepted: { en: "Accepted — verify with retest", es: "Aceptada — verificar con re-test", tone: "violet" },
  closed: { en: "Closed", es: "Cerrada", tone: "ok" },
};

export function isOverdue(c: Pick<Capa, "status" | "dueDate">, now = new Date()): boolean {
  return Boolean(c.dueDate && (c.status === "open" || c.status === "returned") && new Date(c.dueDate + "T23:59:59") < now);
}

/** Returns the patch to apply, or throws when the actor may not perform the action in this state. */
export function capaTransition(capa: Capa, action: CapaAction, isStaff: boolean, now = new Date().toISOString()): Partial<Capa> {
  const editable = capa.status === "open" || capa.status === "returned";
  switch (action.type) {
    case "save":
      if (capa.status === "closed" || (!isStaff && !editable)) throw new CapaTransitionError("This CAPA can no longer be edited.");
      return { ...action.fields, updatedAt: now };
    case "submit":
      if (!editable) throw new CapaTransitionError("Only open or returned CAPAs can be submitted.");
      if (!action.fields.rootCause.trim() || !action.fields.correctiveAction.trim()) throw new CapaTransitionError("Root cause and corrective action are required.");
      return { ...action.fields, status: "submitted", submittedAt: now, updatedAt: now };
    case "accept":
      if (!isStaff) throw new CapaTransitionError("Only Fanatics can accept a CAPA.");
      if (capa.status !== "submitted") throw new CapaTransitionError("Only submitted CAPAs can be accepted.");
      return { status: "accepted", reviewNotes: action.notes, updatedAt: now };
    case "return":
      if (!isStaff) throw new CapaTransitionError("Only Fanatics can return a CAPA.");
      if (capa.status !== "submitted") throw new CapaTransitionError("Only submitted CAPAs can be returned.");
      return { status: "returned", reviewNotes: action.notes, updatedAt: now };
    case "close":
      if (!isStaff) throw new CapaTransitionError("Only Fanatics can close a CAPA.");
      if (capa.status === "closed") throw new CapaTransitionError("Already closed.");
      return { status: "closed", reviewNotes: action.notes || capa.reviewNotes, closedAt: now, updatedAt: now };
    case "link_retest":
      return { retestLotId: action.lotId, updatedAt: now };
  }
}

/** Problem statement generated from the failing tests / methods of a lot. */
export function capaProblemText(ref: string, failed: string[], status: string): string {
  return `Lot ${ref} was ${status === "retest" ? "sent to retest" : "rejected"}. Failing tests / methods: ${failed.length ? failed.join(", ") : "see dossier"}.`;
}
