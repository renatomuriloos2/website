import { KanbanBoard, type BoardCard } from "@/components/KanbanBoard";
import { LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/data";
import { DECORATION_SHORT } from "@/lib/domain/catalog";
import { ago } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { loadWorkspace } from "@/lib/queries";

export const metadata = { title: "Lot board" };

export default async function BoardPage() {
  const ctx = await requireUser();
  const { t } = getI18n();
  const { lots, suppliers, fabrics, analytics } = await loadWorkspace(ctx);
  const staff = isStaff(ctx.user);
  const sMap = new Map(suppliers.map((s) => [s.id, s]));
  const fMap = new Map(fabrics.map((f) => [f.id, f]));
  // Decided lots older than 45 days leave the board (they stay in Lots & dossiers).
  const cutoff = Date.now() - 45 * 86400000;
  const cards: BoardCard[] = lots
    .filter((l) => l.status !== "draft" && (!["approved", "approved_concession", "rejected"].includes(l.status) || new Date(l.updatedAt).getTime() > cutoff))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((l) => {
      const f = fMap.get(l.fabricId);
      const s = sMap.get(l.supplierId);
      const e = analytics.evaluations.get(l.id);
      return {
        id: l.id,
        ref: l.ref,
        status: l.status,
        supplier: s?.name ?? "",
        supplierLogo: s?.logoUrl ?? null,
        fabric: `${f?.code ?? ""} · ${f?.name ?? ""}`,
        swatch: f?.photoUrl ?? null,
        colorHex: f?.colorHex ?? "#ccc",
        program: l.program,
        methods: l.methods.map((m) => DECORATION_SHORT[m]),
        completeness: e?.completeness ?? 0,
        suggested: e?.suggested ?? "in_review",
        maxSafe: e?.maxSafeTempC ?? null,
        isRetest: l.isRetest,
        age: ago(l.updatedAt, t.common),
      };
    });
  return (
    <div>
      <PageHeader kicker="Scrum · Kanban" title={t.board.title} subtitle={staff ? t.board.subtitle : t.board.supplierSubtitle} actions={<LinkButton href="/lots/new" icon="plus">{t.lots.new}</LinkButton>} />
      <KanbanBoard cards={cards} canMove={staff} />
    </div>
  );
}
