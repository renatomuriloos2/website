import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/env";
import { demoDb } from "@/lib/data/demo";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, Role } from "@/lib/domain/types";
import type { Ctx } from "@/lib/data/repo";

export const DEMO_COOKIE = "fx_demo_uid";

export const getSessionUser = cache(async (): Promise<AppUser | null> => {
  if (isDemo()) {
    const id = cookies().get(DEMO_COOKIE)?.value;
    const u = id ? demoDb().users.find((x) => x.id === id && x.active) : null;
    return u ?? null;
  }
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: p } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!p || !p.active) return null;
  return {
    id: p.id,
    email: p.email,
    fullName: p.full_name || p.email,
    role: p.role,
    supplierId: p.supplier_id,
    active: p.active,
    mfaEnabled: (user.factors ?? []).some((f) => f.status === "verified"),
    mustChangePassword: p.must_change_password,
    lastSignInAt: user.last_sign_in_at ?? null,
    createdAt: p.created_at,
  };
});

/** Resolves the signed-in user or redirects. Optionally restricts by role. */
export async function requireUser(roles?: Role[], opts: { allowPasswordChange?: boolean } = {}): Promise<Ctx> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !opts.allowPasswordChange && !isDemo()) redirect("/account/password");
  if (roles && !roles.includes(user.role)) redirect("/dashboard");
  return { user };
}
