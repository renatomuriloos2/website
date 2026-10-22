import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC = ["/login", "/auth", "/api/v1", "/api/health", "/manifest.webmanifest", "/icon"];
const MFA_PATHS = ["/mfa"];

function isDemo(request: NextRequest) {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (process.env.DEMO_MODE === "true" || !configured) return true;
  // Visitor chose "Explore demo" on the login screen (unless disabled with DEMO_SWITCH=false).
  return process.env.DEMO_SWITCH !== "false" && request.cookies.get("fx_mode")?.value === "demo";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const to = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (isDemo(request)) {
    const signedIn = Boolean(request.cookies.get("fx_demo_uid")?.value);
    if (!signedIn && !isPublic) return to("/login");
    if (signedIn && (pathname === "/" || pathname === "/login")) return to("/dashboard");
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return isPublic ? response : to("/login");
  if (pathname.startsWith("/api/v1")) return response;

  // Two-factor enforcement: every account must enrol TOTP and every session must be AAL2.
  const mfaRequired = process.env.MFA_REQUIRED !== "false";
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const onMfa = MFA_PATHS.some((p) => pathname.startsWith(p));
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    return onMfa && pathname === "/mfa" ? response : to("/mfa");
  }
  if (mfaRequired && aal && aal.nextLevel === "aal1" && !onMfa) {
    return to("/mfa/setup");
  }
  if (pathname === "/" || pathname === "/login") return to("/dashboard");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
