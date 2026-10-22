import { NextResponse } from "next/server";
import { buildDataset, toCsv } from "@/lib/bi";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";

export const dynamic = "force-dynamic";

// Session-based CSV export (Excel). Respects the user's scope: suppliers only get their own lots.
export async function GET(_req: Request, { params }: { params: { dataset: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ctx = { user };
  const repo = getRepo();
  let csv: string;
  if (params.dataset === "audit") {
    if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    csv = toCsv((await repo.listAudit(ctx, 5000)).map((a) => ({ ...a })));
  } else if (params.dataset === "lots" || params.dataset === "results" || params.dataset === "colors") {
    const [suppliers, fabrics, lots, results, requirements] = await Promise.all([repo.listSuppliers(ctx), repo.listFabrics(ctx), repo.listLots(ctx), repo.listResults(ctx), repo.listRequirements(ctx)]);
    csv = toCsv(buildDataset(params.dataset, { suppliers, fabrics, lots, results, requirements }));
  } else {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="fanatics-qc-${params.dataset}.csv"`, "Cache-Control": "no-store" } });
}
