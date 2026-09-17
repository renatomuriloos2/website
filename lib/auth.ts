import { createClient } from "@/lib/supabase/server";
import { AppUser, Role } from "@/types/database";
import { redirect } from "next/navigation";

export async function getSessionUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAppUser(allowedRoles?: Role | Role[]): Promise<AppUser> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("id, email, role, client_id")
    .eq("id", user.id)
    .single();

  if (!appUser) {
    redirect("/login");
  }

  if (allowedRoles) {
    const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!allowed.includes(appUser.role)) {
      redirect(appUser.role === "client" ? "/portal" : "/admin");
    }
  }

  return appUser as AppUser;
}
