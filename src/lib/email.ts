// Envío de correo transaccional vía Resend (https://resend.com). Se usa
// exclusivamente en server actions — RESEND_API_KEY nunca se expone al
// navegador (no lleva prefijo NEXT_PUBLIC_).
const RESEND_API_URL = "https://api.resend.com/emails";

export async function enviarCorreoResetPin({
  para,
  nombre,
  link,
}: {
  para: string;
  nombre: string;
  link: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY no está configurada.");

  // Sin dominio propio verificado en Resend, solo funciona como remitente
  // su dirección de prueba onboarding@resend.dev — igual llega a cualquier
  // destinatario. Se puede reemplazar por RESEND_FROM_EMAIL más adelante.
  const from = process.env.RESEND_FROM_EMAIL || "DIPRA <onboarding@resend.dev>";
  const primerNombre = nombre.trim().split(" ")[0] || nombre;

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [para],
      subject: "Restablecé tu PIN de acceso — DIPRA",
      html: `
        <p>Hola ${primerNombre},</p>
        <p>Pediste restablecer el PIN de acceso a tu portal de DIPRA. Tocá el siguiente enlace para elegir uno nuevo (válido por 30 minutos):</p>
        <p><a href="${link}">${link}</a></p>
        <p>Si no fuiste vos, ignorá este correo — tu PIN actual sigue funcionando igual.</p>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend respondió ${res.status}: ${body}`);
  }
}
