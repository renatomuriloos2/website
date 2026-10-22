"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemo } from "@/lib/env";
import { DEMO_COOKIE, getSessionUser } from "@/lib/auth";
import { demoDb } from "@/lib/data/demo";
import { LOCALE_COOKIE } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { passwordIssues } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { errorMessage, isRedirectError, type FormState } from "./state";

const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function setLocaleAction(locale: string) {
  cookies().set(LOCALE_COOKIE, locale === "es" ? "es" : "en", { ...cookieOpts, httpOnly: false, maxAge: 60 * 60 * 24 * 365 });
}

export async function demoSignInAction(formData: FormData) {
  if (!isDemo()) redirect("/login");
  const id = String(formData.get("uid") ?? "");
  if (!demoDb().users.some((u) => u.id === id)) redirect("/login");
  cookies().set(DEMO_COOKIE, id, { ...cookieOpts, maxAge: 60 * 60 * 8 });
  redirect("/dashboard");
}

const signInSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(1).max(128) });

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
    if (!parsed.success) return { error: "invalid" };
    // Brute-force protection on top of Supabase Auth's own limits.
    if (!rateLimit(`login:${ip}`, 10, 15 * 60_000) || !rateLimit(`login:${parsed.data.email}`, 5, 15 * 60_000)) {
      return { error: "Too many attempts. Try again in 15 minutes." };
    }
    const { error } = await createClient().auth.signInWithPassword(parsed.data);
    if (error) return { error: "invalid" };
    redirect("/dashboard");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: errorMessage(err) };
  }
}

export async function signOutAction() {
  if (isDemo()) cookies().delete(DEMO_COOKIE);
  else await createClient().auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await getSessionUser();
    if (!user) redirect("/login");
    const pw = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (pw !== confirm) return { error: "mismatch" };
    const issues = passwordIssues(pw, user.email);
    if (issues.length) return { error: `weak: ${issues.join(", ")}` };
    if (isDemo()) return { error: null, ok: "saved" };
    const sb = createClient();
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) return { error: error.message };
    await sb.rpc("clear_must_change_password");
    redirect("/dashboard");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: errorMessage(err) };
  }
}
