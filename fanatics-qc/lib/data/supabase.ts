import "server-only";
import { createHash, randomBytes, randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Capa,
  GarmentTrial,
  AppUser,
  Evidence,
  Fabric,
  Lot,
  LotEvent,
  LotStatus,
  RequirementRow,
  Supplier,
  TestResult,
} from "@/lib/domain/types";
import { capaTransition } from "@/lib/domain/capa";
import { assertAdmin, assertStaff, assertSupplierScope, ForbiddenError, isStaff, type Ctx, type Repo, type UploadFile } from "./repo";

type Row = Record<string, any>;

const SIGNED_TTL = 60 * 10;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function check(res: { data: any; error: { message: string } | null }): any {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

async function signMany(bucket: "evidence" | "logos", paths: (string | null)[]): Promise<Map<string, string>> {
  const list = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  const map = new Map<string, string>();
  if (!list.length) return map;
  const { data } = await createClient().storage.from(bucket).createSignedUrls(list, SIGNED_TTL);
  data?.forEach((d) => d.signedUrl && d.path && map.set(d.path, d.signedUrl));
  return map;
}

const mapSupplier = (r: Row, urls: Map<string, string>): Supplier => ({
  id: r.id,
  name: r.name,
  code: r.code,
  country: r.country,
  city: r.city,
  contactName: r.contact_name,
  contactEmail: r.contact_email,
  phone: r.phone,
  logoUrl: r.logo_path ? urls.get(r.logo_path) ?? null : null,
  status: r.status,
  tier: r.tier,
  createdAt: r.created_at,
});

const mapFabric = (r: Row, urls: Map<string, string>): Fabric => ({
  id: r.id,
  supplierId: r.supplier_id,
  code: r.code,
  name: r.name,
  fiber: r.fiber,
  composition: r.composition,
  construction: r.construction,
  weightGsm: r.weight_gsm,
  color: r.color,
  colorHex: r.color_hex,
  dyeClass: r.dye_class,
  finish: r.finish,
  photoUrl: r.photo_path ? urls.get(r.photo_path) ?? null : null,
  notes: r.notes,
  createdAt: r.created_at,
});

const mapLot = (r: Row): Lot => ({
  id: r.id,
  ref: r.ref,
  supplierId: r.supplier_id,
  fabricId: r.fabric_id,
  lotNumber: r.lot_number,
  poNumber: r.po_number,
  program: r.program,
  garmentType: r.garment_type,
  quantityM: r.quantity_m === null ? null : Number(r.quantity_m),
  methods: r.methods ?? [],
  colors: r.colors ?? [],
  status: r.status,
  isRetest: r.is_retest,
  parentLotId: r.parent_lot_id,
  labName: r.lab_name,
  submittedAt: r.submitted_at,
  decidedAt: r.decided_at,
  decidedBy: r.decided_by,
  decisionNotes: r.decision_notes,
  overrides: r.overrides ?? {},
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const mapResult = (r: Row): TestResult => ({
  id: r.id,
  lotId: r.lot_id,
  testId: r.test_id,
  colorId: r.color_id ?? null,
  readings: r.readings ?? {},
  assessment: r.assessment,
  deltaE: r.delta_e ?? {},
  labName: r.lab_name,
  testedAt: r.tested_at,
  notes: r.notes,
  createdBy: r.created_by,
  createdAt: r.created_at,
});

const mapEvent = (r: Row): LotEvent => ({
  id: r.id,
  lotId: r.lot_id,
  at: r.at,
  actor: r.actor_name,
  type: r.type,
  from: r.from_status,
  to: r.to_status,
  message: r.message,
});

const mapProfile = (r: Row, auth?: { last_sign_in_at?: string | null; factors?: unknown[] }): AppUser => ({
  id: r.id,
  email: r.email,
  fullName: r.full_name,
  role: r.role,
  supplierId: r.supplier_id,
  active: r.active,
  mfaEnabled: Boolean(auth?.factors?.length),
  mustChangePassword: r.must_change_password,
  lastSignInAt: auth?.last_sign_in_at ?? null,
  createdAt: r.created_at,
});

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

async function upload(bucket: "evidence" | "logos", path: string, file: UploadFile) {
  const { error } = await createClient().storage.from(bucket).upload(path, file.bytes, { contentType: file.mime, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

async function logEvent(ctx: Ctx, lotId: string, type: LotEvent["type"], from: LotStatus | null, to: LotStatus | null, message = "") {
  await createClient().from("lot_events").insert({ lot_id: lotId, actor_id: ctx.user.id, actor_name: ctx.user.fullName, type, from_status: from, to_status: to, message });
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

const mapTrial = (r: Row): GarmentTrial => ({
  id: r.id,
  lotId: r.lot_id,
  colorId: r.color_id,
  method: r.method,
  placement: r.placement,
  washCycles: r.wash_cycles,
  washProcedure: r.wash_procedure,
  appearance: Number(r.appearance),
  cracking: num(r.cracking),
  peeling: num(r.peeling),
  fading: num(r.fading),
  shrinkagePct: num(r.shrinkage_pct),
  beforeEvidenceId: r.before_evidence_id,
  afterEvidenceId: r.after_evidence_id,
  notes: r.notes,
  createdBy: r.created_by,
  createdAt: r.created_at,
});

const mapCapa = (r: Row): Capa => ({
  id: r.id,
  ref: r.ref,
  lotId: r.lot_id,
  supplierId: r.supplier_id,
  status: r.status,
  problem: r.problem,
  rootCause: r.root_cause,
  containment: r.containment,
  correctiveAction: r.corrective_action,
  preventiveAction: r.preventive_action,
  dueDate: r.due_date,
  supplierOwner: r.supplier_owner,
  reviewNotes: r.review_notes,
  retestLotId: r.retest_lot_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  submittedAt: r.submitted_at,
  closedAt: r.closed_at,
});

const capaRow = (c: Partial<Capa>): Row => {
  const map: Record<string, string> = { status: "status", rootCause: "root_cause", containment: "containment", correctiveAction: "corrective_action", preventiveAction: "preventive_action", supplierOwner: "supplier_owner", reviewNotes: "review_notes", retestLotId: "retest_lot_id", submittedAt: "submitted_at", closedAt: "closed_at" };
  const row: Row = {};
  for (const [k, v] of Object.entries(c)) if (map[k]) row[map[k]] = v;
  return row;
};

export const supabaseRepo: Repo = {
  mode: "supabase",

  async listSuppliers() {
    const rows = check(await createClient().from("suppliers").select("*").order("name"));
    const urls = await signMany("logos", rows.map((r: Row) => r.logo_path));
    return rows.map((r: Row) => mapSupplier(r, urls));
  },
  async getSupplier(ctx, id) {
    assertSupplierScope(ctx, id);
    const r = check(await createClient().from("suppliers").select("*").eq("id", id).maybeSingle());
    if (!r) return null;
    return mapSupplier(r, await signMany("logos", [r.logo_path]));
  },
  async saveSupplier(ctx, input, id) {
    assertAdmin(ctx);
    const { logo, ...rest } = input;
    const row: Row = {
      name: rest.name,
      code: rest.code,
      country: rest.country,
      city: rest.city,
      contact_name: rest.contactName,
      contact_email: rest.contactEmail,
      phone: rest.phone,
      status: rest.status,
      tier: rest.tier,
    };
    const sb = createClient();
    const saved = id
      ? check(await sb.from("suppliers").update(row).eq("id", id).select("*").single())
      : check(await sb.from("suppliers").insert(row).select("*").single());
    if (logo) {
      const path = await upload("logos", `${saved.id}/${randomUUID()}-${safeName(logo.name)}`, logo);
      check(await sb.from("suppliers").update({ logo_path: path }).eq("id", saved.id).select("id"));
      saved.logo_path = path;
    }
    return mapSupplier(saved, await signMany("logos", [saved.logo_path]));
  },

  async listFabrics(_ctx, supplierId) {
    let q = createClient().from("fabrics").select("*").order("code");
    if (supplierId) q = q.eq("supplier_id", supplierId);
    const rows = check(await q);
    const urls = await signMany("evidence", rows.map((r: Row) => r.photo_path));
    return rows.map((r: Row) => mapFabric(r, urls));
  },
  async getFabric(_ctx, id) {
    const r = check(await createClient().from("fabrics").select("*").eq("id", id).maybeSingle());
    if (!r) return null;
    return mapFabric(r, await signMany("evidence", [r.photo_path]));
  },
  async saveFabric(ctx, input, id) {
    const supplierId = isStaff(ctx.user) ? input.supplierId : ctx.user.supplierId!;
    assertSupplierScope(ctx, supplierId);
    const sb = createClient();
    const row: Row = {
      supplier_id: supplierId,
      code: input.code,
      name: input.name,
      fiber: input.fiber,
      composition: input.composition,
      construction: input.construction,
      weight_gsm: input.weightGsm,
      color: input.color,
      color_hex: input.colorHex,
      dye_class: input.dyeClass,
      finish: input.finish,
      notes: input.notes,
    };
    if (input.photo) row.photo_path = await upload("evidence", `${supplierId}/fabrics/${randomUUID()}-${safeName(input.photo.name)}`, input.photo);
    const saved = id
      ? check(await sb.from("fabrics").update(row).eq("id", id).select("*").single())
      : check(await sb.from("fabrics").insert(row).select("*").single());
    return mapFabric(saved, await signMany("evidence", [saved.photo_path]));
  },

  async listLots() {
    return check(await createClient().from("lots").select("*").order("created_at", { ascending: false })).map(mapLot);
  },
  async listResults() {
    return check(await createClient().from("test_results").select("*")).map(mapResult);
  },
  async getLotBundle(ctx, id) {
    const sb = createClient();
    const lotRow = check(await sb.from("lots").select("*").eq("id", id).maybeSingle());
    if (!lotRow) return null;
    assertSupplierScope(ctx, lotRow.supplier_id);
    const [fab, sup, res, ev, evt, tri, cap] = await Promise.all([
      sb.from("fabrics").select("*").eq("id", lotRow.fabric_id).single(),
      sb.from("suppliers").select("*").eq("id", lotRow.supplier_id).single(),
      sb.from("test_results").select("*").eq("lot_id", id).order("created_at"),
      sb.from("evidence").select("*").eq("lot_id", id).order("created_at"),
      sb.from("lot_events").select("*").eq("lot_id", id).order("at"),
      sb.from("garment_trials").select("*").eq("lot_id", id).order("created_at"),
      sb.from("capas").select("*").eq("lot_id", id).order("created_at"),
    ]);
    const evRows = check(ev) as Row[];
    const evidenceUrls = await signMany("evidence", [...evRows.map((r) => r.storage_path), check(fab).photo_path]);
    const logoUrls = await signMany("logos", [check(sup).logo_path]);
    return {
      lot: mapLot(lotRow),
      fabric: mapFabric(check(fab), evidenceUrls),
      supplier: mapSupplier(check(sup), logoUrls),
      results: (check(res) as Row[]).map(mapResult),
      evidence: evRows.map(
        (r): Evidence => ({
          id: r.id,
          lotId: r.lot_id,
          resultId: r.result_id,
          kind: r.kind,
          name: r.name,
          mime: r.mime,
          size: Number(r.size_bytes),
          sha256: r.sha256,
          url: evidenceUrls.get(r.storage_path) ?? "",
          uploadedBy: r.uploaded_by_name,
          createdAt: r.created_at,
        })
      ),
      events: (check(evt) as Row[]).map(mapEvent),
      trials: (check(tri) as Row[]).map(mapTrial),
      capas: (check(cap) as Row[]).map(mapCapa),
    };
  },
  async createLot(ctx, input) {
    const sb = createClient();
    const row = check(
      await sb
        .from("lots")
        .insert({
          fabric_id: input.fabricId,
          lot_number: input.lotNumber,
          po_number: input.poNumber,
          program: input.program,
          garment_type: input.garmentType,
          quantity_m: input.quantityM,
          methods: input.methods,
          colors: input.colors,
          lab_name: input.labName,
          parent_lot_id: input.parentLotId,
          status: "submitted",
        })
        .select("*")
        .single()
    );
    await logEvent(ctx, row.id, "created", null, "draft");
    await logEvent(ctx, row.id, "submitted", "draft", "submitted");
    return mapLot(row);
  },
  async setLotStatus(ctx, id, status, message) {
    assertStaff(ctx);
    const sb = createClient();
    const before = check(await sb.from("lots").select("status").eq("id", id).single());
    const row = check(await sb.from("lots").update({ status }).eq("id", id).select("*").single());
    await logEvent(ctx, id, "status", before.status, status, message);
    return mapLot(row);
  },
  async decideLot(ctx, id, input) {
    assertStaff(ctx);
    const sb = createClient();
    const before = check(await sb.from("lots").select("status").eq("id", id).single());
    const row = check(
      await sb
        .from("lots")
        .update({
          status: input.status,
          decision_notes: input.notes,
          overrides: input.overrides,
          decided_at: new Date().toISOString(),
          decided_by: ctx.user.fullName,
        })
        .eq("id", id)
        .select("*")
        .single()
    );
    await logEvent(ctx, id, "decision", before.status, input.status, input.notes);
    return mapLot(row);
  },

  async addResult(ctx, lotId, input) {
    const row = check(
      await createClient()
        .from("test_results")
        .insert({
          lot_id: lotId,
          test_id: input.testId,
          color_id: input.colorId,
          readings: input.readings,
          assessment: input.assessment,
          delta_e: input.deltaE,
          lab_name: input.labName,
          tested_at: input.testedAt,
          notes: input.notes,
        })
        .select("*")
        .single()
    );
    await logEvent(ctx, lotId, "result", null, null, input.testId);
    return mapResult(row);
  },
  async deleteResult(_ctx, id) {
    const { error, count } = await createClient().from("test_results").delete({ count: "exact" }).eq("id", id);
    if (error) throw new Error(error.message);
    if (!count) throw new ForbiddenError();
  },
  async addEvidence(ctx, lotId, kind, resultId, file) {
    const sb = createClient();
    const lot = check(await sb.from("lots").select("supplier_id").eq("id", lotId).single());
    assertSupplierScope(ctx, lot.supplier_id);
    const path = await upload("evidence", `${lot.supplier_id}/${lotId}/${randomUUID()}-${safeName(file.name)}`, file);
    const r = check(
      await sb
        .from("evidence")
        .insert({ lot_id: lotId, result_id: resultId, kind, name: file.name, mime: file.mime, size_bytes: file.size, sha256: file.sha256, storage_path: path, uploaded_by_name: ctx.user.fullName })
        .select("*")
        .single()
    );
    await logEvent(ctx, lotId, "evidence", null, null, file.name);
    const urls = await signMany("evidence", [path]);
    return { id: r.id, lotId, resultId, kind, name: file.name, mime: file.mime, size: file.size, sha256: file.sha256, url: urls.get(path) ?? "", uploadedBy: ctx.user.fullName, createdAt: r.created_at };
  },

  async listGarmentTrials() {
    return check(await createClient().from("garment_trials").select("*")).map(mapTrial);
  },
  async addGarmentTrial(ctx, lotId, input, before, after) {
    const b = before ? await supabaseRepo.addEvidence(ctx, lotId, "garment_before", null, before) : null;
    const a = after ? await supabaseRepo.addEvidence(ctx, lotId, "garment_after", null, after) : null;
    const row = check(
      await createClient()
        .from("garment_trials")
        .insert({
          lot_id: lotId,
          color_id: input.colorId,
          method: input.method,
          placement: input.placement,
          wash_cycles: input.washCycles,
          wash_procedure: input.washProcedure,
          appearance: input.appearance,
          cracking: input.cracking,
          peeling: input.peeling,
          fading: input.fading,
          shrinkage_pct: input.shrinkagePct,
          before_evidence_id: b?.id ?? null,
          after_evidence_id: a?.id ?? null,
          notes: input.notes,
        })
        .select("*")
        .single()
    );
    await logEvent(ctx, lotId, "result", null, null, `garment_trial:${input.method}`);
    return mapTrial(row);
  },
  async deleteGarmentTrial(_ctx, id) {
    const { error, count } = await createClient().from("garment_trials").delete({ count: "exact" }).eq("id", id);
    if (error) throw new Error(error.message);
    if (!count) throw new ForbiddenError();
  },

  async listCapas() {
    return check(await createClient().from("capas").select("*").order("created_at", { ascending: false })).map(mapCapa);
  },
  async getCapa(_ctx, id) {
    const r = check(await createClient().from("capas").select("*").eq("id", id).maybeSingle());
    return r ? mapCapa(r) : null;
  },
  async openCapa(ctx, lotId, problem, dueDate) {
    assertStaff(ctx);
    const sb = createClient();
    const existing = check(await sb.from("capas").select("*").eq("lot_id", lotId).neq("status", "closed").maybeSingle());
    if (existing) return mapCapa(existing);
    return mapCapa(check(await sb.from("capas").insert({ lot_id: lotId, problem, due_date: dueDate }).select("*").single()));
  },
  async updateCapa(ctx, id, action) {
    const current = await supabaseRepo.getCapa(ctx, id);
    if (!current) throw new Error("CAPA not found");
    assertSupplierScope(ctx, current.supplierId);
    const patch = capaRow(capaTransition(current, action, isStaff(ctx.user)));
    // Linking the retest lot is a system step (the supplier may not edit an accepted CAPA).
    const client = action.type === "link_retest" ? createAdminClient() : createClient();
    return mapCapa(check(await client.from("capas").update(patch).eq("id", id).select("*").single()));
  },

  async savePushSubscription(ctx, sub, userAgent) {
    check(await createClient().from("push_subscriptions").upsert({ user_id: ctx.user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, user_agent: userAgent.slice(0, 200) }, { onConflict: "endpoint" }).select("id"));
  },
  async removePushSubscription(_ctx, endpoint) {
    await createClient().from("push_subscriptions").delete().eq("endpoint", endpoint);
  },
  async pushSubscriptions(userIds) {
    if (!userIds.length) return [];
    const rows = check(await createAdminClient().from("push_subscriptions").select("user_id, endpoint, p256dh, auth").in("user_id", userIds));
    return rows.map((r: Row) => ({ userId: r.user_id, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
  },
  async dropPushSubscription(endpoint) {
    await createAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint);
  },

  async listRequirements() {
    const rows = check(await createClient().from("requirements").select("*"));
    return rows.map((r: Row): RequirementRow => ({ fiber: r.fiber, testId: r.test_id, key: r.reading_key, min: r.min_value === null ? null : Number(r.min_value), max: r.max_value === null ? null : Number(r.max_value) }));
  },
  async saveRequirement(ctx, row) {
    assertAdmin(ctx);
    check(
      await createClient()
        .from("requirements")
        .upsert({ fiber: row.fiber, test_id: row.testId, reading_key: row.key, min_value: row.min, max_value: row.max, updated_at: new Date().toISOString(), updated_by: ctx.user.id })
        .select("fiber")
    );
  },

  async listUsers(ctx) {
    assertAdmin(ctx);
    const rows = check(await createClient().from("profiles").select("*").order("created_at"));
    const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
    const byId = new Map((data?.users ?? []).map((u) => [u.id, u]));
    return rows.map((r: Row) => mapProfile(r, byId.get(r.id) as { last_sign_in_at?: string; factors?: unknown[] } | undefined));
  },
  async createUser(ctx, input) {
    assertAdmin(ctx);
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true });
    if (error || !data.user) throw new Error(error?.message ?? "Could not create user");
    const { data: row, error: insErr } = await createClient()
      .from("profiles")
      .insert({ id: data.user.id, email: input.email.toLowerCase(), full_name: input.fullName, role: input.role, supplier_id: input.role === "supplier" ? input.supplierId : null, must_change_password: true })
      .select("*")
      .single();
    if (insErr) {
      // Roll back the auth account so no orphan login remains.
      await admin.auth.admin.deleteUser(data.user.id);
      throw new Error(insErr.message);
    }
    return mapProfile(row);
  },
  async setUserActive(ctx, id, active) {
    assertAdmin(ctx);
    if (id === ctx.user.id) throw new Error("You cannot disable your own account.");
    check(await createClient().from("profiles").update({ active }).eq("id", id).select("id"));
    // Ban / unban at the auth layer too, so existing sessions cannot refresh.
    await createAdminClient().auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
  },
  async recipients(kind) {
    let q = createAdminClient().from("profiles").select("*").eq("active", true);
    q = kind === "staff" ? q.in("role", ["admin", "reviewer"]) : q.eq("supplier_id", kind.supplierId);
    return check(await q).map((r: Row) => mapProfile(r));
  },

  async listNotifications() {
    const rows = check(await createClient().from("notifications").select("*").order("created_at", { ascending: false }).limit(100));
    return rows.map((r: Row) => ({ id: r.id, userId: r.user_id, title: r.title, body: r.body, href: r.href, readAt: r.read_at, createdAt: r.created_at }));
  },
  async markNotificationsRead(ctx) {
    await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", ctx.user.id).is("read_at", null);
  },
  async pushNotifications(userIds, n) {
    if (!userIds.length) return;
    await createAdminClient().from("notifications").insert(userIds.map((user_id) => ({ user_id, ...n })));
  },

  async listAudit(ctx, limit = 200) {
    assertAdmin(ctx);
    const rows = check(await createClient().from("audit_log").select("*").order("id", { ascending: false }).limit(limit));
    return rows.map((r: Row) => ({
      id: String(r.id),
      at: r.at,
      actor: r.actor_email ?? "system",
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      details: summarize(r.details),
    }));
  },

  async listApiKeys(ctx) {
    assertAdmin(ctx);
    const rows = check(await createClient().from("api_keys").select("id,name,prefix,created_at,last_used_at,revoked_at").order("created_at", { ascending: false }));
    return rows.map((r: Row) => ({ id: r.id, name: r.name, prefix: r.prefix, createdAt: r.created_at, lastUsedAt: r.last_used_at, revokedAt: r.revoked_at }));
  },
  async createApiKey(ctx, name) {
    assertAdmin(ctx);
    const token = `fxqc_${randomBytes(24).toString("hex")}`;
    const r = check(await createClient().from("api_keys").insert({ name, prefix: token.slice(0, 12), key_hash: sha(token) }).select("id,name,prefix,created_at").single());
    return { key: { id: r.id, name: r.name, prefix: r.prefix, createdAt: r.created_at, lastUsedAt: null, revokedAt: null }, token };
  },
  async revokeApiKey(ctx, id) {
    assertAdmin(ctx);
    check(await createClient().from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id).select("id"));
  },
  async verifyApiKey(token) {
    const admin = createAdminClient();
    const { data } = await admin.from("api_keys").select("id").eq("key_hash", sha(token)).is("revoked_at", null).maybeSingle();
    if (!data) return null;
    await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
    return data.id as string;
  },
  async biSnapshot() {
    const admin = createAdminClient();
    const [s, f, l, r, q] = await Promise.all([
      admin.from("suppliers").select("*"),
      admin.from("fabrics").select("*"),
      admin.from("lots").select("*"),
      admin.from("test_results").select("*"),
      admin.from("requirements").select("*"),
    ]);
    const none = new Map<string, string>();
    return {
      suppliers: check(s).map((x: Row) => mapSupplier(x, none)),
      fabrics: check(f).map((x: Row) => mapFabric(x, none)),
      lots: check(l).map(mapLot),
      results: check(r).map(mapResult),
      requirements: check(q).map((x: Row) => ({ fiber: x.fiber, testId: x.test_id, key: x.reading_key, min: x.min_value === null ? null : Number(x.min_value), max: x.max_value === null ? null : Number(x.max_value) })),
    };
  },
};

function summarize(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  const d = details as Record<string, unknown>;
  const changed = Object.entries(d).filter(([, v]) => v && typeof v === "object" && "from" in (v as object));
  if (changed.length) {
    return changed
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${JSON.stringify((v as { from: unknown }).from)} → ${JSON.stringify((v as { to: unknown }).to)}`)
      .join(" · ")
      .slice(0, 300);
  }
  return Object.keys(d).length ? `${Object.keys(d).length} fields` : "";
}
