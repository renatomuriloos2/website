import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles Supabase e-mail links (password recovery, invites) using the PKCE code flow.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const url = request.nextUrl.clone();
  url.search = "";
  if (code) {
    const { error } = await createClient().auth.exchangeCodeForSession(code);
    url.pathname = error ? "/login" : "/account/password";
  } else {
    url.pathname = "/login";
  }
  return NextResponse.redirect(url);
}
