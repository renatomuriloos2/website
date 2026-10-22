import { NextResponse } from "next/server";
import { isDemo } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", mode: isDemo() ? "demo" : "supabase", time: new Date().toISOString() });
}
