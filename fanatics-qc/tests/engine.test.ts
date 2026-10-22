import assert from "node:assert/strict";
import { test } from "node:test";
import { DECORATION_MAP, LADDER_TEMPS, TEST_MAP, ladderKey } from "../lib/domain/catalog";
import { deltaEToGrade, evaluateLot, evaluateLotColors, evaluateMethod, evaluateTest } from "../lib/domain/engine";
import { toCsv } from "../lib/bi";
import { passwordIssues, generateTempPassword } from "../lib/password";
import type { Readings, TestResult } from "../lib/domain/types";

const ladder = (onset: number): Readings => Object.fromEntries(LADDER_TEMPS.map((t) => [ladderKey(t), t < onset ? 5 : 3]));
const res = (testId: string, readings: Readings, colorId: string | null = null, at = "2026-01-01"): TestResult => ({
  id: Math.random().toString(36),
  lotId: "l1",
  testId,
  colorId,
  readings,
  assessment: "gray_scale",
  deltaE: {},
  labName: "",
  testedAt: at,
  notes: "",
  createdBy: "u",
  createdAt: at,
});

test("ΔE converts to AATCC gray-scale grades", () => {
  assert.equal(deltaEToGrade(0), 5);
  assert.equal(deltaEToGrade(1.7, "change"), 4);
  assert.equal(deltaEToGrade(3.4, "change"), 3);
  assert.equal(deltaEToGrade(4.5, "staining"), 4);
  assert.equal(deltaEToGrade(50, "staining"), 1);
});

test("heat ladder → max safe temperature is the last continuous pass", () => {
  const out = evaluateTest(TEST_MAP.dye_migration, "polyester", ladder(175));
  assert.equal(out.maxSafeTempC, 170);
  assert.equal(out.status, "pass");
});

test("cotton fabric: sublimation is not applicable", () => {
  const m = evaluateMethod(DECORATION_MAP.sublimation, "cotton", []);
  assert.equal(m.verdict, "not_applicable");
});

test("plastisol on polyester bleeding at 160 °C but fine at 150 °C → conditional with low-cure + max temp", () => {
  const results = [
    res("dye_migration", ladder(155)),
    res("print_adhesion", { adhesion: 5 }),
    res("print_wash", { cracking: 4.5, peeling: 5, fading: 4 }),
    res("stretch_crack", { crack: 4 }),
    res("storage_transfer", { staining: 4.5 }),
    res("lead", { pb: 10 }),
  ];
  const m = evaluateMethod(DECORATION_MAP.screen_plastisol, "polyester", results);
  assert.equal(m.verdict, "conditional");
  assert.equal(m.maxTempC, 150);
  assert.ok(m.conditions.includes("max_temp"));
  assert.ok(m.conditions.includes("low_cure_ink"));
});

test("severe bleed below the low-cure temperature → rejected", () => {
  const severe: Readings = Object.fromEntries(LADDER_TEMPS.map((t) => [ladderKey(t), 2]));
  const m = evaluateMethod(DECORATION_MAP.heat_transfer, "polyester", [res("dye_migration", severe), res("peel_strength", { peel: 12 }), res("print_wash", { cracking: 5, peeling: 5, fading: 5 }), res("storage_transfer", { staining: 5 })]);
  assert.equal(m.verdict, "rejected");
});

test("moderate bleed (grade 3) → conditional with bleed blocker", () => {
  const moderate: Readings = Object.fromEntries(LADDER_TEMPS.map((t) => [ladderKey(t), 3]));
  const m = evaluateMethod(DECORATION_MAP.screen_plastisol, "polyester", [res("dye_migration", moderate), res("print_adhesion", { adhesion: 5 }), res("print_wash", { cracking: 5, peeling: 5, fading: 5 })]);
  assert.ok(m.conditions.includes("bleed_blocker"));
});

test("fiber-specific requirement: cotton wet crock 2.5 passes, polyester needs 3", () => {
  assert.equal(evaluateTest(TEST_MAP.cf_crock, "cotton", { dry: 4, wet: 2.5 }).status, "pass");
  assert.equal(evaluateTest(TEST_MAP.cf_crock, "polyester", { dry: 4, wet: 2.5 }).status, "fail");
});

test("dimensional change uses absolute value", () => {
  assert.equal(evaluateTest(TEST_MAP.dim_change, "polyester", { length: -3.5, width: -1 }).status, "fail");
  assert.equal(evaluateTest(TEST_MAP.dim_change, "polyester", { length: -2.5, width: 1 }).status, "pass");
});

test("admin override wins over the engine", () => {
  const m = evaluateMethod(DECORATION_MAP.dtg, "polyester", [], undefined, { verdict: "approved", conditions: ["pretreatment"], maxTempC: 140, notes: "lab trial OK" });
  assert.equal(m.verdict, "approved");
  assert.equal(m.overridden, true);
});

test("per-color: the lot takes the worst color", () => {
  const lot = { methods: ["heat_label" as const], colors: [{ id: "c1", name: "White", hex: "#ffffff", code: "" }, { id: "c2", name: "Navy", hex: "#14213D", code: "" }], overrides: {} };
  const results = [res("dye_migration", ladder(200), "c1"), res("dye_migration", ladder(135), "c2"), res("peel_strength", { peel: 12 }), res("print_wash", { cracking: 5, peeling: 5, fading: 5 })];
  const { overall, perColor } = evaluateLotColors("polyester", lot, results);
  assert.equal(perColor[0].evaluation.requested[0].verdict, "approved");
  assert.equal(perColor[1].evaluation.requested[0].maxTempC, 130);
  assert.equal(overall.maxSafeTempC, 130);
  assert.notEqual(overall.requested[0].verdict, "approved");
});

test("critical base failure suggests retest/rejection", () => {
  const e = evaluateLot("polyester", [], [res("cf_laundering", { change: 2, st_acetate: 4, st_cotton: 4, st_nylon: 4, st_polyester: 4, st_acrylic: 4, st_wool: 4 })]);
  assert.ok(["retest", "rejected"].includes(e.suggested));
});

test("CSV export neutralises formula injection", () => {
  const csv = toCsv([{ a: "=HYPERLINK(\"http://x\")", b: "ok, quoted" }]);
  assert.ok(csv.includes(`"'=HYPERLINK(""http://x"")"`));
  assert.ok(csv.includes('"ok, quoted"'));
});

test("password policy", () => {
  assert.ok(passwordIssues("short").length > 0);
  assert.ok(passwordIssues("Fanatics2026!!").includes("no common words"));
  assert.deepEqual(passwordIssues("Blue-Heron-Delta-77"), []);
  for (let i = 0; i < 20; i++) assert.deepEqual(passwordIssues(generateTempPassword()), []);
});
