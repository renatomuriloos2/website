import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

function getResendClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Falta RESEND_API_KEY en las variables de entorno. Consíguela en resend.com → API Keys."
      );
    }
    client = new Resend(apiKey);
  }
  return client;
}

function fromAddress(): string {
  // onboarding@resend.dev funciona para pruebas (solo llega a la cuenta dueña
  // de la API key). Para enviar a clientes reales hace falta un dominio propio
  // verificado en Resend y RESEND_FROM_EMAIL apuntando a ese dominio.
  return process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
}

export async function sendVisitReminderEmail(params: {
  to: string;
  clientName: string;
  system: string;
  visitDate: string;
}) {
  const { to, clientName, system, visitDate } = params;
  const formattedDate = new Date(visitDate + "T00:00:00").toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to,
    subject: `Recordatorio: visita técnica de ${system} esta semana — ${clientName}`,
    html: `
      <div style="font-family: sans-serif; color: #17100b; line-height: 1.5;">
        <p>Hola,</p>
        <p>
          Este es un recordatorio de que la próxima visita técnica de <strong>${system}</strong>
          para <strong>${clientName}</strong> está programada para el
          <strong>${formattedDate}</strong>.
        </p>
        <p>Este correo es automático — no hace falta responderlo.</p>
        <p style="color: #6b625b; font-size: 12px;">Rethink — Portal de clientes</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(typeof error === "string" ? error : error.message);
  }
}
