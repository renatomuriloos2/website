import { notFound } from "next/navigation";
import { FabricForm } from "@/components/EntityForms";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRepo, isStaff } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export default async function EditFabricPage({ params }: { params: { id: string } }) {
  const ctx = await requireUser();
  const { t } = getI18n();
  const repo = getRepo();
  const fabric = await repo.getFabric(ctx, params.id).catch(() => null);
  if (!fabric) notFound();
  return (
    <div>
      <PageHeader title={`${t.common.edit} · ${fabric.code}`} />
      <FabricForm fabric={fabric} suppliers={await repo.listSuppliers(ctx)} lockSupplier={isStaff(ctx.user) ? null : ctx.user.supplierId} />
    </div>
  );
}
