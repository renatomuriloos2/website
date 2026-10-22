import "server-only";
import { createHash, randomBytes, randomUUID } from "crypto";
import { buildDemoDb, type DemoDb } from "@/lib/demo/seed";
import { swatchSvg } from "@/lib/demo/art";
import { capaTransition } from "@/lib/domain/capa";
import type { AppUser, Capa, Evidence, GarmentTrial, Lot, LotEvent, LotStatus } from "@/lib/domain/types";
import {
  assertAdmin,
  assertStaff,
  assertSupplierScope,
  ForbiddenError,
  isStaff,
  type Ctx,
  type Repo,
  type UploadFile,
} from "./repo";

// In-memory store. Survives hot reloads in dev via globalThis; on serverless
// hosts each instance has its own copy, which is fine for a demo.
const g = globalThis as unknown as { __fxDemoDb?: DemoDb };
export function demoDb(): DemoDb {
  if (!g.__fxDemoDb) g.__fxDemoDb = buildDemoDb();
  return g.__fxDemoDb;
}

const now = () => new Date().toISOString();
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function toDataUrl(file: UploadFile): string {
  return `data:${file.mime};base64,${Buffer.from(file.bytes).toString("base64")}`;
}

function audit(ctx: Ctx, action: string, entity: string, entityId: string, details = "") {
  demoDb().audit.unshift({ id: randomUUID(), at: now(), actor: ctx.user.email, action, entity, entityId, details });
}

function event(ctx: Ctx, lot: Lot, type: LotEvent["type"], from: LotStatus | null, to: LotStatus | null, message = "") {
  demoDb().events.push({ id: randomUUID(), lotId: lot.id, at: now(), actor: ctx.user.fullName, type, from, to, message });
}

function lotFor(ctx: Ctx, id: string): Lot {
  const lot = demoDb().lots.find((l) => l.id === id);
  if (!lot) throw new Error("Lot not found");
  assertSupplierScope(ctx, lot.supplierId);
  return lot;
}

export const demoRepo: Repo = {
  mode: "demo",

  async listSuppliers(ctx) {
    const all = demoDb().suppliers;
    return isStaff(ctx.user) ? all : all.filter((s) => s.id === ctx.user.supplierId);
  },
  async getSupplier(ctx, id) {
    assertSupplierScope(ctx, id);
    return demoDb().suppliers.find((s) => s.id === id) ?? null;
  },
  async saveSupplier(ctx, input, id) {
    assertAdmin(ctx);
    const db = demoDb();
    const { logo, ...rest } = input;
    if (id) {
      const s = db.suppliers.find((x) => x.id === id);
      if (!s) throw new Error("Supplier not found");
      Object.assign(s, rest, logo ? { logoUrl: toDataUrl(logo) } : {});
      audit(ctx, "supplier.update", "supplier", s.code);
      return s;
    }
    const s = { ...rest, id: `sup_${randomUUID().slice(0, 8)}`, logoUrl: logo ? toDataUrl(logo) : null, createdAt: now() };
    db.suppliers.push(s);
    audit(ctx, "supplier.create", "supplier", s.code, s.name);
    return s;
  },

  async listFabrics(ctx, supplierId) {
    let all = demoDb().fabrics;
    if (!isStaff(ctx.user)) all = all.filter((f) => f.supplierId === ctx.user.supplierId);
    if (supplierId) all = all.filter((f) => f.supplierId === supplierId);
    return all;
  },
  async getFabric(ctx, id) {
    const f = demoDb().fabrics.find((x) => x.id === id) ?? null;
    if (f) assertSupplierScope(ctx, f.supplierId);
    return f;
  },
  async saveFabric(ctx, input, id) {
    const supplierId = isStaff(ctx.user) ? input.supplierId : ctx.user.supplierId!;
    assertSupplierScope(ctx, supplierId);
    const db = demoDb();
    const { photo, ...rest } = input;
    const photoUrl = photo ? toDataUrl(photo) : swatchSvg(input.colorHex || "#888888", input.construction);
    if (id) {
      const f = db.fabrics.find((x) => x.id === id);
      if (!f) throw new Error("Fabric not found");
      assertSupplierScope(ctx, f.supplierId);
      Object.assign(f, rest, { supplierId }, photo ? { photoUrl } : {});
      audit(ctx, "fabric.update", "fabric", f.code);
      return f;
    }
    const f = { ...rest, supplierId, id: `fab_${randomUUID().slice(0, 8)}`, photoUrl, createdAt: now() };
    db.fabrics.push(f);
    audit(ctx, "fabric.create", "fabric", f.code, f.name);
    return f;
  },

  async listLots(ctx) {
    const all = demoDb().lots;
    return isStaff(ctx.user) ? all : all.filter((l) => l.supplierId === ctx.user.supplierId);
  },
  async listResults(ctx) {
    const db = demoDb();
    if (isStaff(ctx.user)) return db.results;
    const ids = new Set(db.lots.filter((l) => l.supplierId === ctx.user.supplierId).map((l) => l.id));
    return db.results.filter((r) => ids.has(r.lotId));
  },
  async getLotBundle(ctx, id) {
    const db = demoDb();
    const lot = db.lots.find((l) => l.id === id);
    if (!lot) return null;
    assertSupplierScope(ctx, lot.supplierId);
    return {
      lot,
      fabric: db.fabrics.find((f) => f.id === lot.fabricId)!,
      supplier: db.suppliers.find((s) => s.id === lot.supplierId)!,
      results: db.results.filter((r) => r.lotId === id),
      evidence: db.evidence.filter((e) => e.lotId === id),
      events: db.events.filter((e) => e.lotId === id).sort((a, b) => a.at.localeCompare(b.at)),
      trials: db.trials.filter((t) => t.lotId === id),
      capas: db.capas.filter((c) => c.lotId === id),
    };
  },
  async createLot(ctx, input) {
    const db = demoDb();
    const fabric = db.fabrics.find((f) => f.id === input.fabricId);
    if (!fabric) throw new Error("Fabric not found");
    assertSupplierScope(ctx, fabric.supplierId);
    const year = new Date().getFullYear();
    const n = db.lots.length + 101;
    const lot: Lot = {
      ...input,
      id: `lot_${randomUUID().slice(0, 8)}`,
      ref: `QC-${year}-${String(n).padStart(4, "0")}`,
      supplierId: fabric.supplierId,
      status: "submitted",
      isRetest: Boolean(input.parentLotId),
      submittedAt: now(),
      decidedAt: null,
      decidedBy: null,
      decisionNotes: "",
      overrides: {},
      createdBy: ctx.user.id,
      createdAt: now(),
      updatedAt: now(),
    };
    db.lots.push(lot);
    event(ctx, lot, "created", null, "draft");
    event(ctx, lot, "submitted", "draft", "submitted");
    audit(ctx, "lot.create", "lot", lot.ref);
    return lot;
  },
  async setLotStatus(ctx, id, status, message) {
    const lot = lotFor(ctx, id);
    if (!isStaff(ctx.user) && !(lot.status === "draft" && status === "submitted")) throw new ForbiddenError();
    const from = lot.status;
    lot.status = status;
    lot.updatedAt = now();
    event(ctx, lot, "status", from, status, message);
    audit(ctx, "lot.status", "lot", lot.ref, `${from} → ${status}`);
    return lot;
  },
  async decideLot(ctx, id, input) {
    assertStaff(ctx);
    const lot = lotFor(ctx, id);
    const from = lot.status;
    Object.assign(lot, {
      status: input.status,
      decisionNotes: input.notes,
      overrides: input.overrides,
      decidedAt: now(),
      decidedBy: ctx.user.fullName,
      updatedAt: now(),
    });
    event(ctx, lot, "decision", from, input.status, input.notes);
    audit(ctx, "lot.decide", "lot", lot.ref, `${from} → ${input.status}`);
    return lot;
  },

  async addResult(ctx, lotId, input) {
    const lot = lotFor(ctx, lotId);
    const res = { ...input, id: randomUUID(), lotId, createdBy: ctx.user.id, createdAt: now() };
    demoDb().results.push(res);
    lot.updatedAt = now();
    event(ctx, lot, "result", null, null, input.testId);
    audit(ctx, "result.create", "lot", lot.ref, input.testId);
    return res;
  },
  async deleteResult(ctx, id) {
    const db = demoDb();
    const r = db.results.find((x) => x.id === id);
    if (!r) return;
    const lot = lotFor(ctx, r.lotId);
    if (!isStaff(ctx.user) && ["approved", "approved_concession", "rejected"].includes(lot.status)) throw new ForbiddenError();
    db.results = db.results.filter((x) => x.id !== id);
    audit(ctx, "result.delete", "lot", lot.ref, r.testId);
  },
  async addEvidence(ctx, lotId, kind, resultId, file) {
    const lot = lotFor(ctx, lotId);
    const ev: Evidence = {
      id: randomUUID(),
      lotId,
      resultId,
      kind,
      name: file.name,
      mime: file.mime,
      size: file.size,
      sha256: file.sha256,
      url: file.size <= 6_000_000 ? toDataUrl(file) : "",
      uploadedBy: ctx.user.fullName,
      createdAt: now(),
    };
    demoDb().evidence.push(ev);
    event(ctx, lot, "evidence", null, null, file.name);
    audit(ctx, "evidence.upload", "lot", lot.ref, `${file.name} · sha256 ${file.sha256.slice(0, 12)}…`);
    return ev;
  },

  async listGarmentTrials(ctx) {
    const db = demoDb();
    if (isStaff(ctx.user)) return db.trials;
    const ids = new Set(db.lots.filter((l) => l.supplierId === ctx.user.supplierId).map((l) => l.id));
    return db.trials.filter((t) => ids.has(t.lotId));
  },
  async addGarmentTrial(ctx, lotId, input, before, after) {
    const lot = lotFor(ctx, lotId);
    const db = demoDb();
    const store = async (file: UploadFile | null, kind: "garment_before" | "garment_after") => (file ? (await demoRepo.addEvidence(ctx, lotId, kind, null, file)).id : null);
    const trial: GarmentTrial = {
      ...input,
      id: randomUUID(),
      lotId,
      beforeEvidenceId: await store(before, "garment_before"),
      afterEvidenceId: await store(after, "garment_after"),
      createdBy: ctx.user.id,
      createdAt: now(),
    };
    db.trials.push(trial);
    lot.updatedAt = now();
    event(ctx, lot, "result", null, null, `garment_trial:${input.method}`);
    audit(ctx, "garment_trial.create", "lot", lot.ref, `${input.method} · ${input.washCycles} washes · appearance ${input.appearance}`);
    return trial;
  },
  async deleteGarmentTrial(ctx, id) {
    const db = demoDb();
    const t = db.trials.find((x) => x.id === id);
    if (!t) return;
    const lot = lotFor(ctx, t.lotId);
    if (!isStaff(ctx.user) && ["approved", "approved_concession", "rejected"].includes(lot.status)) throw new ForbiddenError();
    db.trials = db.trials.filter((x) => x.id !== id);
    audit(ctx, "garment_trial.delete", "lot", lot.ref, t.method);
  },

  async listCapas(ctx) {
    const all = demoDb().capas;
    return (isStaff(ctx.user) ? all : all.filter((c) => c.supplierId === ctx.user.supplierId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getCapa(ctx, id) {
    const c = demoDb().capas.find((x) => x.id === id) ?? null;
    if (c) assertSupplierScope(ctx, c.supplierId);
    return c;
  },
  async openCapa(ctx, lotId, problem, dueDate) {
    assertStaff(ctx);
    const db = demoDb();
    const lot = lotFor(ctx, lotId);
    const existing = db.capas.find((c) => c.lotId === lotId && c.status !== "closed");
    if (existing) return existing;
    const capa: Capa = {
      id: randomUUID(),
      ref: `CAPA-${new Date().getFullYear()}-${String(db.capas.length + 1).padStart(4, "0")}`,
      lotId,
      supplierId: lot.supplierId,
      status: "open",
      problem,
      rootCause: "",
      containment: "",
      correctiveAction: "",
      preventiveAction: "",
      dueDate,
      supplierOwner: "",
      reviewNotes: "",
      retestLotId: null,
      createdAt: now(),
      updatedAt: now(),
      submittedAt: null,
      closedAt: null,
    };
    db.capas.push(capa);
    audit(ctx, "capa.open", "capa", capa.ref, lot.ref);
    return capa;
  },
  async updateCapa(ctx, id, action) {
    const c = demoDb().capas.find((x) => x.id === id);
    if (!c) throw new Error("CAPA not found");
    assertSupplierScope(ctx, c.supplierId);
    Object.assign(c, capaTransition(c, action, isStaff(ctx.user)));
    audit(ctx, `capa.${action.type}`, "capa", c.ref, c.status);
    return c;
  },

  async savePushSubscription(ctx, sub) {
    const db = demoDb();
    db.pushSubs = db.pushSubs.filter((x) => x.endpoint !== sub.endpoint);
    db.pushSubs.push({ ...sub, userId: ctx.user.id });
  },
  async removePushSubscription(ctx, endpoint) {
    const db = demoDb();
    db.pushSubs = db.pushSubs.filter((x) => !(x.endpoint === endpoint && x.userId === ctx.user.id));
  },
  async pushSubscriptions(userIds) {
    return demoDb().pushSubs.filter((x) => userIds.includes(x.userId));
  },
  async dropPushSubscription(endpoint) {
    const db = demoDb();
    db.pushSubs = db.pushSubs.filter((x) => x.endpoint !== endpoint);
  },

  async listRequirements() {
    return demoDb().requirements;
  },
  async saveRequirement(ctx, row) {
    assertAdmin(ctx);
    const db = demoDb();
    db.requirements = db.requirements.filter((r) => !(r.fiber === row.fiber && r.testId === row.testId && r.key === row.key));
    db.requirements.push(row);
    audit(ctx, "requirement.update", "requirement", `${row.fiber}/${row.testId}/${row.key}`, `min ${row.min ?? "—"} · max ${row.max ?? "—"}`);
  },

  async listUsers(ctx) {
    assertAdmin(ctx);
    return demoDb().users;
  },
  async createUser(ctx, input) {
    assertAdmin(ctx);
    const db = demoDb();
    if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) throw new Error("A user with this e-mail already exists.");
    const u: AppUser = {
      id: `u_${randomUUID().slice(0, 8)}`,
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      role: input.role,
      supplierId: input.role === "supplier" ? input.supplierId : null,
      active: true,
      mfaEnabled: false,
      mustChangePassword: true,
      lastSignInAt: null,
      createdAt: now(),
    };
    db.users.push(u);
    audit(ctx, "user.create", "user", u.email, u.role);
    return u;
  },
  async setUserActive(ctx, id, active) {
    assertAdmin(ctx);
    const u = demoDb().users.find((x) => x.id === id);
    if (!u) return;
    if (u.id === ctx.user.id) throw new Error("You cannot disable your own account.");
    u.active = active;
    audit(ctx, active ? "user.enable" : "user.disable", "user", u.email);
  },
  async recipients(kind) {
    const users = demoDb().users.filter((u) => u.active);
    return kind === "staff" ? users.filter(isStaff) : users.filter((u) => u.supplierId === kind.supplierId);
  },

  async listNotifications(ctx) {
    return demoDb()
      .notifications.filter((n) => n.userId === ctx.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async markNotificationsRead(ctx) {
    demoDb().notifications.forEach((n) => {
      if (n.userId === ctx.user.id && !n.readAt) n.readAt = now();
    });
  },
  async pushNotifications(userIds, n) {
    const db = demoDb();
    userIds.forEach((userId) => db.notifications.push({ id: randomUUID(), userId, ...n, readAt: null, createdAt: now() }));
  },

  async listAudit(ctx, limit = 200) {
    assertAdmin(ctx);
    return demoDb().audit.slice(0, limit);
  },

  async listApiKeys(ctx) {
    assertAdmin(ctx);
    return demoDb().apiKeys.map(({ hash: _hash, ...k }) => k);
  },
  async createApiKey(ctx, name) {
    assertAdmin(ctx);
    const token = `fxqc_${randomBytes(24).toString("hex")}`;
    const key = { id: randomUUID(), name, prefix: token.slice(0, 12), hash: sha(token), createdAt: now(), lastUsedAt: null, revokedAt: null };
    demoDb().apiKeys.push(key);
    audit(ctx, "apikey.create", "api_key", key.prefix, name);
    const { hash: _hash, ...pub } = key;
    return { key: pub, token };
  },
  async revokeApiKey(ctx, id) {
    assertAdmin(ctx);
    const k = demoDb().apiKeys.find((x) => x.id === id);
    if (k) {
      k.revokedAt = now();
      audit(ctx, "apikey.revoke", "api_key", k.prefix);
    }
  },
  async verifyApiKey(token) {
    const k = demoDb().apiKeys.find((x) => x.hash === sha(token) && !x.revokedAt);
    if (!k) return null;
    k.lastUsedAt = now();
    return k.id;
  },
  async biSnapshot() {
    const db = demoDb();
    return { suppliers: db.suppliers, fabrics: db.fabrics, lots: db.lots, results: db.results, requirements: db.requirements };
  },
};
