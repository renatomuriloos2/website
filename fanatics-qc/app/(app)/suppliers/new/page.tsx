import { SupplierForm } from "@/components/EntityForms";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";

export default async function NewSupplierPage() {
  await requireUser(["admin"]);
  const { t } = getI18n();
  return (
    <div>
      <PageHeader title={t.suppliers.new} />
      <SupplierForm />
    </div>
  );
}
