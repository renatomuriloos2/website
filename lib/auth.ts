import { createClient } from "@/lib/supabase/server";
import { AppUser } from "@/types/database";
import { redirect } from "next/navigation";

export async function getSessionUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAppUser(role?: "admin" | "client"): Promise<AppUser> {
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

  if (role && appUser.role !== role) {
    redirect(appUser.role === "admin" ? "/admin" : "/portal");
  }

  return appUser as AppUser;
}
