import "server-only";
import { getRepo, type Ctx } from "@/lib/data";
import { TEST_MAP } from "@/lib/domain/catalog";
import { capaProblemText } from "@/lib/domain/capa";
import { evaluateLotColors, indexRequirements } from "@/lib/domain/engine";
import type { Lot } from "@/lib/domain/types";
import { notify } from "@/lib/notify";

// Internal CAPA automation called from server actions after the caller's
// identity has been verified. Not a "use server" module on purpose: these
// functions take a context object and must never be exposed as endpoints.

/** Opens a CAPA for a rejected / retest lot (idempotent) and notifies the mill. Used by decisions and the board. */
export async function ensureCapaForLot(ctx: Ctx, lot: Lot) {
  if (lot.status !== "rejected" && lot.status !== "retest") return;
  const repo = getRepo();
  const bundle = await repo.getLotBundle(ctx, lot.id);
  if (!bundle || bundle.capas.some((c) => c.status !== "closed")) return;
  const reqs = indexRequirements(await repo.listRequirements(ctx));
  const { overall } = evaluateLotColors(bundle.fabric.fiber, bundle.lot, bundle.results, reqs, bundle.trials);
  const failed = Array.from(new Set([...overall.baseFailed, ...overall.requested.flatMap((m) => m.failedTests)])).map((id) => (id === "garment_trial" ? "Finished-garment wash trial" : TEST_MAP[id]?.code ?? id));
  const due = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const capa = await repo.openCapa(ctx, lot.id, capaProblemText(lot.ref, failed, lot.status), due);
  await notify(repo, { supplierId: lot.supplierId }, { title: `${capa.ref} opened for lot ${lot.ref}`, body: `Please submit root cause and corrective / preventive actions by ${due}.`, href: `/capa/${capa.id}` });
}

/** Retest lot submitted → link it to the parent's CAPA. */
export async function linkRetestToCapa(ctx: Ctx, lot: Lot) {
  if (!lot.parentLotId) return;
  const repo = getRepo();
  const parent = await repo.getLotBundle(ctx, lot.parentLotId);
  const capa = parent?.capas.find((c) => c.status !== "closed");
  if (capa) await repo.updateCapa(ctx, capa.id, { type: "link_retest", lotId: lot.id });
}

/** Retest lot approved → close the accepted CAPA it verifies. */
export async function closeCapaVerifiedBy(ctx: Ctx, lot: Lot) {
  if (!lot.parentLotId || (lot.status !== "approved" && lot.status !== "approved_concession")) return;
  const repo = getRepo();
  const capa = (await repo.listCapas(ctx)).find((c) => c.retestLotId === lot.id && c.status === "accepted");
  if (!capa) return;
  await repo.updateCapa(ctx, capa.id, { type: "close", notes: `Effectiveness verified: retest lot ${lot.ref} ${lot.status === "approved" ? "approved" : "approved with concession"}.` });
  await notify(repo, { supplierId: lot.supplierId }, { title: `${capa.ref} closed`, body: `Verified by retest lot ${lot.ref}.`, href: `/capa/${capa.id}` });
}

