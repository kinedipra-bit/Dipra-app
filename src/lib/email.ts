// Envío de correo transaccional vía Resend (https://resend.com). Se usa
// exclusivamente en server actions — RESEND_API_KEY nunca se expone al
// navegador (no lleva prefijo NEXT_PUBLIC_).
const RESEND_API_URL = "https://api.resend.com/emails";

// Gmail no se puede verificar como dominio remitente en Resend (no es un
// dominio propio), así que el remitente sigue siendo DIPRA/Resend — pero
// con esto, si el cliente le da "Responder", el correo le llega a Nicolás
// a su Gmail en vez de perderse en la dirección de envío.
const REPLY_TO = "kine.dipra@gmail.com";

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
      reply_to: REPLY_TO,
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

export async function enviarCorreoLinkPortal({
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
      reply_to: REPLY_TO,
      subject: "Tu portal DIPRA",
      html: `
        <p>Hola ${primerNombre},</p>
        <p>Este es el link a tu portal de DIPRA, donde vas a poder ver tu planificación y registrar tus sesiones:</p>
        <p><a href="${link}">${link}</a></p>
        <p>La primera vez que entres te va a pedir que elijas un PIN de 4 dígitos para proteger tu información.</p>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend respondió ${res.status}: ${body}`);
  }
}
