"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { DECORATION_MAP, TEST_MAP } from "@/lib/domain/catalog";
import { deltaEToGrade } from "@/lib/domain/engine";
import type { ConditionCode, DecorationCode, LotStatus, MethodOverride, Readings, Verdict } from "@/lib/domain/types";
import { notify } from "@/lib/notify";
import { readUpload } from "@/lib/upload";
import { errorMessage, isRedirectError, type FormState } from "./state";

const STATUSES = ["draft", "submitted", "in_review", "retest", "on_hold", "approved", "approved_concession", "rejected"] as const;
const txt = (max: number) => z.string().trim().max(max);

const lotSchema = z.object({
  fabricId: z.string().min(1),
  lotNumber: txt(60).min(1),
  poNumber: txt(60),
  program: txt(80),
  garmentType: z.enum(["jersey", "tee", "hoodie", "polo", "shorts"]),
  quantityM: z.coerce.number().min(0).max(10_000_000).nullable(),
  methods: z.array(z.string().refine((m) => m in DECORATION_MAP)).min(1),
  labName: txt(120),
  parentLotId: z.string().nullable(),
});

export async function createLotAction(_prev: FormState, fd: FormData): Promise<FormState> {
  let id: string;
  try {
    const ctx = await requireUser();
    const repo = getRepo();
    const input = lotSchema.parse({
      fabricId: fd.get("fabricId"),
      lotNumber: fd.get("lotNumber"),
      poNumber: fd.get("poNumber") ?? "",
      program: fd.get("program") ?? "",
      garmentType: fd.get("garmentType"),
      quantityM: fd.get("quantityM") ? fd.get("quantityM") : null,
      methods: fd.getAll("methods").map(String),
      labName: fd.get("labName") ?? "",
      parentLotId: fd.get("parentLotId") ? String(fd.get("parentLotId")) : null,
    });
    const names = fd.getAll("color_name").map((v) => String(v).trim());
    const hexes = fd.getAll("color_hex").map(String);
    const codes = fd.getAll("color_code").map((v) => String(v).trim());
    const colors = z
      .array(z.object({ id: z.string(), name: txt(60).min(1), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/), code: txt(30) }))
      .max(20)
      .parse(names.map((name, i) => ({ id: `c${i + 1}`, name, hex: hexes[i] ?? "#888888", code: codes[i] ?? "" })).filter((c) => c.name));
    if (!colors.length) {
      const fabric = await repo.getFabric(ctx, input.fabricId);
      if (fabric) colors.push({ id: "c1", name: fabric.color || "Main", hex: fabric.colorHex, code: "" });
    }
    const lot = await repo.createLot(ctx, { ...input, colors, methods: input.methods as DecorationCode[] });
    const supplier = await repo.getSupplier(ctx, lot.supplierId);
    await notify(repo, "staff", {
      title: `New lot submitted · ${lot.ref}`,
      body: `${supplier?.name ?? ""} submitted lot ${lot.lotNumber} (${lot.program || lot.garmentType}) for ${lot.methods.length} decoration method(s).`,
      href: `/lots/${lot.id}`,
    });
    id = lot.id;
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/", "layout");
  redirect(`/lots/${id}?created=1`);
}

const num = (v: FormDataEntryValue | null) => {
  if (v === null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export async function addResultAction(lotId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const ctx = await requireUser();
    const repo = getRepo();
    const testId = String(fd.get("testId") ?? "");
    const test = TEST_MAP[testId];
    if (!test) return { error: "Select a test method." };
    const assessment = z.enum(["gray_scale", "spectrophotometer", "visual", "instrument"]).parse(fd.get("assessment"));
    const readings: Readings = {};
    const deltaE: Readings = {};
    for (const r of test.readings) {
      if (assessment === "spectrophotometer" && test.kind !== "numeric" && r.scale) {
        const de = num(fd.get(`de_${r.key}`));
        deltaE[r.key] = de;
        readings[r.key] = de === null ? null : deltaEToGrade(de, r.scale);
      } else {
        const v = num(fd.get(`r_${r.key}`));
        if (v !== null && test.kind !== "numeric" && (v < 1 || v > 5 || (v * 2) % 1 !== 0)) return { error: `${r.label.en}: grades are 1–5 in half steps.` };
        readings[r.key] = v;
      }
    }
    if (Object.values(readings).every((v) => v === null)) return { error: "Enter at least one reading." };
    const colorRaw = String(fd.get("colorId") ?? "");
    const colorId = colorRaw ? z.string().regex(/^c\d{1,2}$/).parse(colorRaw) : null;
    const result = await repo.addResult(ctx, lotId, {
      testId,
      colorId,
      readings,
      assessment,
      deltaE,
      labName: txt(120).parse(fd.get("labName") ?? ""),
      testedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(fd.get("testedAt")),
      notes: txt(1000).parse(fd.get("notes") ?? ""),
    });
    for (const f of fd.getAll("files")) {
      const file = await readUpload(f as File, "evidence");
      if (file) await repo.addEvidence(ctx, lotId, file.mime.startsWith("image/") ? "photo" : file.mime === "application/pdf" ? "report" : "spectro", result.id, file);
    }
    revalidatePath(`/lots/${lotId}`);
    return { error: null, ok: "saved" };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function deleteResultAction(lotId: string, resultId: string) {
  const ctx = await requireUser();
  await getRepo().deleteResult(ctx, resultId);
  revalidatePath(`/lots/${lotId}`);
}

export async function uploadEvidenceAction(lotId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const ctx = await requireUser();
    const repo = getRepo();
    const kind = z.enum(["photo", "report", "spectro", "other"]).parse(fd.get("kind") ?? "photo");
    let n = 0;
    for (const f of fd.getAll("files")) {
      const file = await readUpload(f as File, "evidence");
      if (file) {
        await repo.addEvidence(ctx, lotId, kind, null, file);
        n++;
      }
    }
    if (!n) return { error: "Choose at least one file." };
    revalidatePath(`/lots/${lotId}`);
    return { error: null, ok: `${n}` };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function moveLotAction(lotId: string, status: string) {
  const ctx = await requireUser(["admin", "reviewer"]);
  const s = z.enum(STATUSES).parse(status) as LotStatus;
  const repo = getRepo();
  const lot = await repo.setLotStatus(ctx, lotId, s, "");
  if (["retest", "on_hold"].includes(s)) {
    await notify(repo, { supplierId: lot.supplierId }, { title: `Lot ${lot.ref} · ${s === "retest" ? "retest required" : "on hold"}`, body: `Fanatics QC moved your lot ${lot.lotNumber} to "${s.replace("_", " ")}".`, href: `/lots/${lot.id}` });
  }
  revalidatePath("/board");
  revalidatePath(`/lots/${lotId}`);
}

export async function decideLotAction(lotId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const ctx = await requireUser(["admin", "reviewer"]);
    const repo = getRepo();
    const status = z.enum(STATUSES).parse(fd.get("status")) as LotStatus;
    const notes = txt(2000).parse(fd.get("notes") ?? "");
    const overrides: Partial<Record<DecorationCode, MethodOverride>> = {};
    for (const code of Object.keys(DECORATION_MAP) as DecorationCode[]) {
      const v = fd.get(`ov_${code}`);
      if (!v || v === "auto") continue;
      const verdict = z.enum(["approved", "conditional", "rejected", "not_applicable"]).parse(v) as Verdict;
      overrides[code] = {
        verdict,
        conditions: fd.getAll(`ovc_${code}`).map(String) as ConditionCode[],
        maxTempC: num(fd.get(`ovt_${code}`)),
        notes: txt(300).parse(fd.get(`ovn_${code}`) ?? ""),
      };
    }
    const lot = await repo.decideLot(ctx, lotId, { status, notes, overrides });
    await notify(repo, { supplierId: lot.supplierId }, {
      title: `Decision on ${lot.ref}: ${status.replace("_", " ")}`,
      body: notes || `Fanatics QC recorded a decision for lot ${lot.lotNumber}.`,
      href: `/lots/${lot.id}`,
    });
    revalidatePath("/", "layout");
    return { error: null, ok: "saved" };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: errorMessage(err) };
  }
}
