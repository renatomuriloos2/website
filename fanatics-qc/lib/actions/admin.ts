"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { FIBER_MAP, TEST_MAP } from "@/lib/domain/catalog";
import type { FiberType } from "@/lib/domain/types";
import { generateTempPassword } from "@/lib/password";
import { readUpload } from "@/lib/upload";
import { errorMessage, type FormState } from "./state";

const txt = (max: number) => z.string().trim().max(max);

export async function saveSupplierAction(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  let savedId: string;
  try {
    const ctx = await requireUser(["admin"]);
    const input = z
      .object({
        name: txt(120).min(2),
        code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,12}$/, "2–12 letters, digits or dashes"),
        country: txt(60),
        city: txt(60),
        contactName: txt(120),
        contactEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(254)]),
        phone: txt(40),
        status: z.enum(["active", "onboarding", "inactive"]),
        tier: z.enum(["strategic", "approved", "probation"]),
      })
      .parse(Object.fromEntries(["name", "code", "country", "city", "contactName", "contactEmail", "phone", "status", "tier"].map((k) => [k, fd.get(k) ?? ""])));
    const logo = await readUpload(fd.get("logo") as File | null, "image");
    const s = await getRepo().saveSupplier(ctx, { ...input, logo }, id ?? undefined);
    savedId = s.id;
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/", "layout");
  redirect(`/suppliers/${savedId}`);
}

export async function saveFabricAction(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  let savedId: string;
  try {
    const ctx = await requireUser();
    const input = z
      .object({
        supplierId: z.string(),
        code: txt(40).min(1),
        name: txt(120).min(1),
        fiber: z.string().refine((f) => f in FIBER_MAP),
        composition: txt(120),
        construction: txt(60),
        weightGsm: z.coerce.number().int().min(40).max(1000).nullable(),
        color: txt(60),
        colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        dyeClass: txt(60),
        finish: txt(80),
        notes: txt(1000),
      })
      .parse({
        ...Object.fromEntries(["supplierId", "code", "name", "fiber", "composition", "construction", "color", "colorHex", "dyeClass", "finish", "notes"].map((k) => [k, fd.get(k) ?? ""])),
        weightGsm: fd.get("weightGsm") ? fd.get("weightGsm") : null,
      });
    const photo = await readUpload(fd.get("photo") as File | null, "image");
    const f = await getRepo().saveFabric(ctx, { ...input, fiber: input.fiber as FiberType, photo }, id ?? undefined);
    savedId = f.id;
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/fabrics");
  redirect(`/fabrics/${savedId}`);
}

export async function saveRequirementAction(fd: FormData) {
  const ctx = await requireUser(["admin"]);
  const fiber = String(fd.get("fiber"));
  const testId = String(fd.get("testId"));
  const key = String(fd.get("key"));
  if (!(fiber in FIBER_MAP) || !TEST_MAP[testId] || !TEST_MAP[testId].readings.some((r) => r.key === key)) throw new Error("Invalid requirement");
  const n = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? null : Number(v));
  const min = n(fd.get("min"));
  const max = n(fd.get("max"));
  if ((min !== null && !Number.isFinite(min)) || (max !== null && !Number.isFinite(max))) throw new Error("Invalid number");
  await getRepo().saveRequirement(ctx, { fiber: fiber as FiberType, testId, key, min, max });
  revalidatePath("/protocols");
}

export async function createUserAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const ctx = await requireUser(["admin"]);
    const input = z
      .object({
        email: z.string().trim().toLowerCase().email().max(254),
        fullName: txt(120).min(2),
        role: z.enum(["admin", "reviewer", "supplier"]),
        supplierId: z.string().nullable(),
      })
      .parse({ email: fd.get("email"), fullName: fd.get("fullName"), role: fd.get("role"), supplierId: fd.get("supplierId") ? String(fd.get("supplierId")) : null });
    if (input.role === "supplier" && !input.supplierId) return { error: "supplier_required" };
    const password = generateTempPassword();
    const u = await getRepo().createUser(ctx, { ...input, password });
    revalidatePath("/users");
    return { error: null, ok: "created", data: { email: u.email, password } };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function setUserActiveAction(id: string, active: boolean) {
  const ctx = await requireUser(["admin"]);
  await getRepo().setUserActive(ctx, id, active);
  revalidatePath("/users");
}

export async function markNotificationsReadAction() {
  const ctx = await requireUser();
  await getRepo().markNotificationsRead(ctx);
  revalidatePath("/", "layout");
}

export async function createApiKeyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const ctx = await requireUser(["admin"]);
    const name = txt(60).min(2).parse(fd.get("name"));
    const { token } = await getRepo().createApiKey(ctx, name);
    revalidatePath("/integrations");
    return { error: null, ok: "created", data: { token } };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function revokeApiKeyAction(id: string) {
  const ctx = await requireUser(["admin"]);
  await getRepo().revokeApiKey(ctx, id);
  revalidatePath("/integrations");
}
