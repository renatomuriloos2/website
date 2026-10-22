"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getRepo, isStaff, type CapaFields } from "@/lib/data";
import { DECORATION_MAP } from "@/lib/domain/catalog";
import type { DecorationCode } from "@/lib/domain/types";
import { ensureCapaForLot } from "@/lib/capa-flow";
import { notify } from "@/lib/notify";
import { readUpload } from "@/lib/upload";
import { errorMessage, type FormState } from "./state";

const grade = z.coerce.number().min(1).max(5).refine((v) => (v * 2) % 1 === 0, "grades are 1–5 in half steps");
const optGrade = z.union([z.literal("").transform(() => null), grade]).nullable();

// ─── Finished-garment wash trials ───────────────────────────────────────────

export async function addGarmentTrialAction(lotId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const ctx = await requireUser();
    const input = z
      .object({
        colorId: z.string().regex(/^c\d{1,2}$/).nullable(),
        method: z.string().refine((m) => m in DECORATION_MAP),
        placement: z.string().trim().max(10),
        washCycles: z.coerce.number().int().min(1).max(200),
        washProcedure: z.string().trim().max(200),
        appearance: grade,
        cracking: optGrade,
        peeling: optGrade,
        fading: optGrade,
        shrinkagePct: z.union([z.literal("").transform(() => null), z.coerce.number().min(-30).max(30)]).nullable(),
        notes: z.string().trim().max(1000),
      })
      .parse({
        colorId: fd.get("colorId") ? String(fd.get("colorId")) : null,
        method: fd.get("method"),
        placement: fd.get("placement") ?? "",
        washCycles: fd.get("washCycles"),
        washProcedure: fd.get("washProcedure") ?? "",
        appearance: fd.get("appearance"),
        cracking: fd.get("cracking") ?? "",
        peeling: fd.get("peeling") ?? "",
        fading: fd.get("fading") ?? "",
        shrinkagePct: fd.get("shrinkagePct") ?? "",
        notes: fd.get("notes") ?? "",
      });
    const before = await readUpload(fd.get("before") as File | null, "image");
    const after = await readUpload(fd.get("after") as File | null, "image");
    if (!before || !after) return { error: "Before and after photos are required." };
    await getRepo().addGarmentTrial(ctx, lotId, { ...input, method: input.method as DecorationCode }, before, after);
    revalidatePath(`/lots/${lotId}`);
    return { error: null, ok: "saved" };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function deleteGarmentTrialAction(lotId: string, id: string) {
  const ctx = await requireUser();
  await getRepo().deleteGarmentTrial(ctx, id);
  revalidatePath(`/lots/${lotId}`);
}

// ─── CAPA ───────────────────────────────────────────────────────────────────

const txt = (max: number) => z.string().trim().max(max);

export async function capaAction(capaId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const ctx = await requireUser();
    const repo = getRepo();
    const intent = z.enum(["save", "submit", "accept", "return", "close"]).parse(fd.get("intent"));
    const fields: CapaFields = {
      rootCause: txt(4000).parse(fd.get("rootCause") ?? ""),
      containment: txt(4000).parse(fd.get("containment") ?? ""),
      correctiveAction: txt(4000).parse(fd.get("correctiveAction") ?? ""),
      preventiveAction: txt(4000).parse(fd.get("preventiveAction") ?? ""),
      supplierOwner: txt(120).parse(fd.get("supplierOwner") ?? ""),
    };
    const notes = txt(2000).parse(fd.get("reviewNotes") ?? "");
    const capa =
      intent === "save" || intent === "submit"
        ? await repo.updateCapa(ctx, capaId, { type: intent, fields })
        : await repo.updateCapa(ctx, capaId, { type: intent, notes });
    if (intent === "submit") await notify(repo, "staff", { title: `${capa.ref} submitted for review`, body: `Root cause: ${fields.rootCause.slice(0, 140)}`, href: `/capa/${capa.id}` });
    if (intent === "accept" || intent === "return" || intent === "close") {
      const verb = intent === "accept" ? "accepted" : intent === "return" ? "returned for more work" : "closed";
      await notify(repo, { supplierId: capa.supplierId }, { title: `${capa.ref} ${verb}`, body: notes || "See Fanatics review notes.", href: `/capa/${capa.id}` });
    }
    revalidatePath("/capa");
    revalidatePath(`/capa/${capaId}`);
    revalidatePath(`/lots/${capa.lotId}`);
    return { error: null, ok: intent };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function openCapaAction(lotId: string) {
  const ctx = await requireUser(["admin", "reviewer"]);
  const bundle = await getRepo().getLotBundle(ctx, lotId);
  if (bundle && isStaff(ctx.user)) await ensureCapaForLot(ctx, bundle.lot);
  revalidatePath(`/lots/${lotId}`);
  revalidatePath("/capa");
}
