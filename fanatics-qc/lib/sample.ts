import "server-only";
import { buildDemoDb } from "@/lib/demo/seed";
import { demoDb } from "@/lib/data/demo";
import { isDemo } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// "Load sample data" lets a new user see the full potential of the portal
// (dashboards, board, dossiers) before real lots exist. Sample rows are
// synthetic and flagged so they can be removed in one click.

const g = globalThis as unknown as { __fxDemoDb?: ReturnType<typeof buildDemoDb> };

export async function loadSampleData(): Promise<{ lots: number }> {
  if (isDemo()) {
    g.__fxDemoDb = buildDemoDb();
    return { lots: g.__fxDemoDb.lots.length };
  }

  const sample = buildDemoDb();
  const admin = createAdminClient();
  const must = <T,>(r: { data: T; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message);
    return r.data;
  };

  const { count } = await admin.from("suppliers").select("id", { count: "exact", head: true }).eq("is_sample", true);
  if (count) throw new Error("Sample data is already loaded. Remove it first.");

  // Suppliers (codes prefixed so they never collide with real ones)
  const supRows = must(
    await admin
      .from("suppliers")
      .insert(sample.suppliers.map((s) => ({ name: `${s.name} (sample)`, code: `S-${s.code}`.slice(0, 12), country: s.country, city: s.city, contact_name: s.contactName, contact_email: s.contactEmail, phone: s.phone, status: s.status, tier: s.tier, is_sample: true })))
      .select("id, code")
  ) as { id: string; code: string }[];
  const supId = new Map(sample.suppliers.map((s) => [s.id, supRows.find((r) => r.code === `S-${s.code}`.slice(0, 12))!.id]));

  const fabRows = must(
    await admin
      .from("fabrics")
      .insert(sample.fabrics.map((f) => ({ supplier_id: supId.get(f.supplierId), code: f.code, name: f.name, fiber: f.fiber, composition: f.composition, construction: f.construction, weight_gsm: f.weightGsm, color: f.color, color_hex: f.colorHex, dye_class: f.dyeClass, finish: f.finish, notes: "Sample data" })))
      .select("id, code, supplier_id")
  ) as { id: string; code: string; supplier_id: string }[];
  const fabId = new Map(sample.fabrics.map((f) => [f.id, fabRows.find((r) => r.code === f.code && r.supplier_id === supId.get(f.supplierId))!.id]));

  // Lots in creation order so retests can reference their parent.
  const lotId = new Map<string, string>();
  for (const l of [...sample.lots].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const row = must(
      await admin
        .from("lots")
        .insert({
          fabric_id: fabId.get(l.fabricId),
          lot_number: l.lotNumber,
          po_number: l.poNumber,
          program: l.program,
          garment_type: l.garmentType,
          quantity_m: l.quantityM,
          methods: l.methods,
          colors: l.colors,
          status: l.status,
          is_retest: l.isRetest,
          parent_lot_id: l.parentLotId ? lotId.get(l.parentLotId) ?? null : null,
          lab_name: l.labName,
          submitted_at: l.submittedAt,
          decided_at: l.decidedAt,
          decided_by: l.decidedBy,
          decision_notes: l.decisionNotes,
          created_at: l.createdAt,
        })
        .select("id")
        .single()
    ) as { id: string };
    lotId.set(l.id, row.id);
  }

  const results = sample.results.map((r) => ({ lot_id: lotId.get(r.lotId), test_id: r.testId, color_id: r.colorId, readings: r.readings, assessment: r.assessment, delta_e: r.deltaE, lab_name: r.labName, tested_at: r.testedAt.slice(0, 10), notes: r.notes, created_at: r.createdAt }));
  for (let i = 0; i < results.length; i += 500) must(await admin.from("test_results").insert(results.slice(i, i + 500)));

  const events = sample.events.map((e) => ({ lot_id: lotId.get(e.lotId), at: e.at, actor_name: e.actor, type: e.type, from_status: e.from, to_status: e.to, message: e.message }));
  for (let i = 0; i < events.length; i += 500) must(await admin.from("lot_events").insert(events.slice(i, i + 500)));

  return { lots: lotId.size };
}

export async function removeSampleData(): Promise<void> {
  if (isDemo()) {
    const db = demoDb();
    const staff = db.users.filter((u) => u.role !== "supplier");
    Object.assign(db, { suppliers: [], fabrics: [], lots: [], results: [], evidence: [], events: [], notifications: [], users: staff });
    return;
  }
  const admin = createAdminClient();
  const { data: sups } = await admin.from("suppliers").select("id").eq("is_sample", true);
  const ids = (sups ?? []).map((s) => s.id as string);
  if (!ids.length) return;
  // Retests reference their parent; clear the link first, then delete children → parents.
  await admin.from("lots").update({ parent_lot_id: null }).in("supplier_id", ids);
  for (const table of ["lots", "fabrics"] as const) {
    const { error } = await admin.from(table).delete().in("supplier_id", ids);
    if (error) throw new Error(error.message);
  }
  const { error } = await admin.from("suppliers").delete().in("id", ids);
  if (error) throw new Error(error.message);
}
