import "server-only";
import { computeAnalytics } from "@/lib/analytics";
import { getRepo, type Ctx } from "@/lib/data";

export async function loadWorkspace(ctx: Ctx) {
  const repo = getRepo();
  const [lots, results, suppliers, fabrics, requirements, trials, capas] = await Promise.all([
    repo.listLots(ctx),
    repo.listResults(ctx),
    repo.listSuppliers(ctx),
    repo.listFabrics(ctx),
    repo.listRequirements(ctx),
    repo.listGarmentTrials(ctx),
    repo.listCapas(ctx),
  ]);
  const analytics = computeAnalytics({ lots, results, suppliers, fabrics, requirements, trials, capas });
  return { lots, results, suppliers, fabrics, requirements, trials, capas, analytics };
}
