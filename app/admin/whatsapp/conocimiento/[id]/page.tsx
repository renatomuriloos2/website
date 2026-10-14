import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllClients } from "@/lib/admin-data";
import { DocumentForm } from "@/components/whatsapp/DocumentForm";
import { deleteDocumentAction } from "@/lib/actions/whatsapp";
import { KbDocument } from "@/types/database";

export default async function EditDocumentPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data }, clients] = await Promise.all([
    supabase.from("kb_documents").select("*").eq("id", params.id).single(),
    getAllClients(supabase),
  ]);
  if (!data) notFound();
  const doc = data as KbDocument;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/whatsapp/conocimiento" className="text-xs text-rethink-orange hover:underline">
        ← Base de conocimiento
      </Link>
      <h1 className="mb-1 mt-2 text-xl font-semibold text-rethink-cream">{doc.title}</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        {doc.file_name ? `Extraído de ${doc.file_name}. ` : ""}
        Puedes corregir el texto (por ejemplo, tablas que el PDF leyó mal); al guardar se vuelve a
        indexar.
      </p>
      <div className="card mb-6">
        <DocumentForm clients={clients} document={doc} />
      </div>
      <form action={deleteDocumentAction} className="flex items-center gap-3">
        <input type="hidden" name="id" value={doc.id} />
        <button type="submit" className="text-sm text-red-400 hover:underline">
          Eliminar documento
        </button>
        <span className="text-xs text-rethink-cream/40">No se puede deshacer.</span>
      </form>
    </div>
  );
}
