import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

// /api/cron/* y /api/whatsapp/* no usan sesión de Supabase — Vercel Cron y
// Meta los llaman sin cookies. /api/cron valida Authorization: Bearer
// CRON_SECRET y /api/whatsapp la firma X-Hub-Signature-256 de Meta.
const PUBLIC_PATHS = ["/login", "/auth", "/api/cron", "/api/whatsapp"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: appUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = appUser?.role;

    if (pathname === "/login" || pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = role === "client" ? "/portal" : "/admin";
      return NextResponse.redirect(url);
    }

    const adminOnly = [
      "/admin/usuarios",
      "/admin/whatsapp/configuracion",
      "/admin/whatsapp/costos",
      "/admin/whatsapp/probar",
    ];
    if (adminOnly.some((p) => pathname.startsWith(p)) && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin") && role !== "admin" && role !== "tecnico") {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/portal") && role !== "client") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
