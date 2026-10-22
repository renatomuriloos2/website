import { FabricForm } from "@/components/EntityForms";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRepo, isStaff } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export default async function NewFabricPage() {
  const ctx = await requireUser();
  const { t } = getI18n();
  const suppliers = await getRepo().listSuppliers(ctx);
  return (
    <div>
      <PageHeader title={t.fabrics.new} />
      <FabricForm suppliers={suppliers} lockSupplier={isStaff(ctx.user) ? null : ctx.user.supplierId} />
    </div>
  );
}
