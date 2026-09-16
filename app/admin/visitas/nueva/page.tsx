import { createClient } from "@/lib/supabase/server";
import { getAllClients, getAllParameterRanges } from "@/lib/admin-data";
import { VisitForm } from "@/components/VisitForm";

export default async function NuevaVisitaPage() {
  const supabase = createClient();
  const [clients, ranges] = await Promise.all([
    getAllClients(supabase),
    getAllParameterRanges(supabase),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Registrar visita</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        Captura lecturas, dosificación y recomendación de la visita.
      </p>
      <VisitForm clients={clients} allRanges={ranges} />
    </div>
  );
}
