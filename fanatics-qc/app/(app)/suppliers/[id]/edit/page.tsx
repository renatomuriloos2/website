import { notFound } from "next/navigation";
import { SupplierForm } from "@/components/EntityForms";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export default async function EditSupplierPage({ params }: { params: { id: string } }) {
  const ctx = await requireUser(["admin"]);
  const { t } = getI18n();
  const s = await getRepo().getSupplier(ctx, params.id);
  if (!s) notFound();
  return (
    <div>
      <PageHeader title={`${t.common.edit} · ${s.name}`} />
      <SupplierForm supplier={s} />
    </div>
  );
}
