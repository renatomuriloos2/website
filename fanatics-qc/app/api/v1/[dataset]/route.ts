import { NextResponse, type NextRequest } from "next/server";
import { DATASETS, buildDataset, toCsv, type Dataset } from "@/lib/bi";
import { getRepo } from "@/lib/data";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Read-only BI API. Auth: `Authorization: Bearer fxqc_…` (keys created in BI & API, stored as SHA-256 hashes).
export async function GET(req: NextRequest, { params }: { params: { dataset: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`api:${ip}`, 120, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!/^fxqc_[a-f0-9]{48}$/.test(token)) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  const repo = getRepo();
  if (!(await repo.verifyApiKey(token))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(DATASETS as readonly string[]).includes(params.dataset)) return NextResponse.json({ error: "not_found", datasets: DATASETS }, { status: 404 });

  const rows = buildDataset(params.dataset as Dataset, await repo.biSnapshot());
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (req.nextUrl.searchParams.get("format") === "csv") {
    return new NextResponse(toCsv(rows), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="fanatics-qc-${params.dataset}.csv"` } });
  }
  return NextResponse.json({ dataset: params.dataset, count: rows.length, generated_at: new Date().toISOString(), data: rows }, { headers });
}
