import { Alert, LinkButton, PageHeader } from "@/components/ui";
import { LotForm } from "@/components/LotForm";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "New lot" };

export default async function NewLotPage({ searchParams }: { searchParams: { fabric?: string; retest?: string } }) {
  const ctx = await requireUser();
  const { t } = getI18n();
  const repo = getRepo();
  const [fabrics, suppliers, lots] = await Promise.all([repo.listFabrics(ctx), repo.listSuppliers(ctx), repo.listLots(ctx)]);
  const retestOptions = lots.filter((l) => l.status === "retest" || l.status === "rejected").map((l) => ({ id: l.id, ref: l.ref, fabricId: l.fabricId }));
  const parent = searchParams.retest ? lots.find((l) => l.id === searchParams.retest) : null;
  return (
    <div>
      <PageHeader title={t.lots.new} subtitle={t.lots.methodsHint} />
      {fabrics.length === 0 ? (
        <Alert tone="warn">
          {t.fabrics.subtitle} — <LinkButton href="/fabrics/new" variant="ghost">{t.fabrics.new}</LinkButton>
        </Alert>
      ) : (
        <LotForm fabrics={fabrics} suppliers={suppliers.filter((s) => fabrics.some((f) => f.supplierId === s.id))} retestOptions={retestOptions} defaults={{ fabricId: parent?.fabricId ?? searchParams.fabric, parentLotId: parent?.id }} />
      )}
    </div>
  );
}
