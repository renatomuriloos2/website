import assert from "node:assert/strict";
import { test } from "node:test";
import { LADDER_TEMPS, ladderKey } from "../lib/domain/catalog";
import { capaTransition, isOverdue } from "../lib/domain/capa";
import { evaluateGarmentTrial, evaluateLotColors } from "../lib/domain/engine";
import type { Capa, GarmentTrial, Readings, TestResult } from "../lib/domain/types";

const trial = (p: Partial<GarmentTrial>): GarmentTrial => ({
  id: "t", lotId: "l1", colorId: null, method: "heat_label", placement: "NL", washCycles: 25, washProcedure: "",
  appearance: 4.5, cracking: 4.5, peeling: 5, fading: 4, shrinkagePct: -2, beforeEvidenceId: null, afterEvidenceId: null,
  notes: "", createdBy: "u", createdAt: "2026-01-01", ...p,
});

test("garment trial: pass / concession / fail", () => {
  assert.equal(evaluateGarmentTrial(trial({})).status, "pass");
  assert.equal(evaluateGarmentTrial(trial({ fading: 3 })).status, "concession");
  assert.equal(evaluateGarmentTrial(trial({ cracking: 2.5 })).status, "fail");
  assert.equal(evaluateGarmentTrial(trial({ cracking: 3.5, peeling: 3.5 })).status, "fail");
  assert.deepEqual(evaluateGarmentTrial(trial({ shrinkagePct: -6 })).failures, ["shrinkage"]);
});

test("failed garment trial downgrades the method and the lot suggestion", () => {
  const ladder: Readings = Object.fromEntries(LADDER_TEMPS.map((t) => [ladderKey(t), 5]));
  const r = (testId: string, readings: Readings): TestResult => ({ id: testId, lotId: "l1", testId, colorId: null, readings, assessment: "gray_scale", deltaE: {}, labName: "", testedAt: "2026-01-01", notes: "", createdBy: "u", createdAt: "2026-01-01" });
  const results = [r("dye_migration", ladder), r("peel_strength", { peel: 12 }), r("print_wash", { cracking: 5, peeling: 5, fading: 5 })];
  const lot = { methods: ["heat_label" as const], colors: [], overrides: {} };
  const ok = evaluateLotColors("polyester", lot, results).overall.requested[0];
  assert.equal(ok.verdict, "approved");
  const bad = evaluateLotColors("polyester", lot, results, undefined, [trial({ cracking: 2 })]).overall;
  assert.equal(bad.requested[0].verdict, "rejected");
  assert.ok(bad.requested[0].failedTests.includes("garment_trial"));
  const cons = evaluateLotColors("polyester", lot, results, undefined, [trial({ fading: 3 })]).overall.requested[0];
  assert.equal(cons.verdict, "conditional");
});

const capa = (p: Partial<Capa> = {}): Capa => ({
  id: "c", ref: "CAPA-1", lotId: "l1", supplierId: "s1", status: "open", problem: "p", rootCause: "", containment: "", correctiveAction: "",
  preventiveAction: "", dueDate: "2020-01-01", supplierOwner: "", reviewNotes: "", retestLotId: null, createdAt: "", updatedAt: "",
  submittedAt: null, closedAt: null, ...p,
});
const fields = { rootCause: "rc", containment: "c", correctiveAction: "ca", preventiveAction: "pa", supplierOwner: "o" };

test("CAPA workflow transitions and permissions", () => {
  assert.throws(() => capaTransition(capa(), { type: "submit", fields: { ...fields, rootCause: "" } }, false));
  assert.equal(capaTransition(capa(), { type: "submit", fields }, false).status, "submitted");
  assert.throws(() => capaTransition(capa({ status: "submitted" }), { type: "save", fields }, false));
  assert.throws(() => capaTransition(capa({ status: "submitted" }), { type: "accept", notes: "" }, false));
  assert.equal(capaTransition(capa({ status: "submitted" }), { type: "accept", notes: "ok" }, true).status, "accepted");
  assert.equal(capaTransition(capa({ status: "submitted" }), { type: "return", notes: "more data" }, true).status, "returned");
  assert.equal(capaTransition(capa({ status: "returned" }), { type: "submit", fields }, false).status, "submitted");
  assert.equal(capaTransition(capa({ status: "accepted" }), { type: "close", notes: "" }, true).status, "closed");
  assert.throws(() => capaTransition(capa({ status: "closed" }), { type: "close", notes: "" }, true));
});

test("CAPA overdue only while waiting on the supplier", () => {
  assert.equal(isOverdue(capa({ status: "open" })), true);
  assert.equal(isOverdue(capa({ status: "submitted" })), false);
  assert.equal(isOverdue(capa({ status: "open", dueDate: "2999-01-01" })), false);
});
