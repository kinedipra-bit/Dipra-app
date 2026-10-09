// Envío de correo transaccional vía Resend (https://resend.com). Se usa
// exclusivamente en server actions — RESEND_API_KEY nunca se expone al
// navegador (no lleva prefijo NEXT_PUBLIC_).
const RESEND_API_URL = "https://api.resend.com/emails";

// Mensaje de error específico: sin RESEND_FROM_EMAIL (dominio propio
// verificado), el remitente es el de pruebas de Resend (onboarding@resend.dev),
// que SOLO puede mandar correo a la casilla dueña de la cuenta de Resend —
// a cualquier cliente real, Resend lo rechaza con 403. No es un problema
// pasajero: hace falta verificar un dominio propio en resend.com/domains.
class ErrorDominioResendNoVerificado extends Error {
  constructor() {
    super(
      "Resend todavía no tiene un dominio propio verificado — por ahora solo puede enviar correos a kine.dipra@gmail.com, no a los clientes. Hay que verificar un dominio en resend.com/domains."
    );
  }
}

async function postResend(body: Record<string, unknown>) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY no está configurada.");

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const texto = await res.text().catch(() => "");
    if (res.status === 403 && /only send testing emails|verify a domain/i.test(texto)) {
      throw new ErrorDominioResendNoVerificado();
    }
    throw new Error(`Resend respondió ${res.status}: ${texto}`);
  }
}

// Gmail no se puede verificar como dominio remitente en Resend (no es un
// dominio propio), así que el remitente sigue siendo DIPRA/Resend — pero
// con esto, si el cliente le da "Responder", el correo le llega a Nicolás
// a su Gmail en vez de perderse en la dirección de envío.
// La API de Resend espera reply_to como ARRAY, no como string suelto —
// mandarlo como string hace que la API rechace el envío entero.
const REPLY_TO = ["kine.dipra@gmail.com"];

export async function enviarCorreoResetPin({
  para,
  nombre,
  link,
}: {
  para: string;
  nombre: string;
  link: string;
}) {
  // Sin dominio propio verificado en Resend, solo funciona como remitente
  // su dirección de prueba onboarding@resend.dev — que a su vez solo puede
  // mandar a la casilla dueña de la cuenta de Resend (ver postResend).
  const from = process.env.RESEND_FROM_EMAIL || "DIPRA <onboarding@resend.dev>";
  const primerNombre = nombre.trim().split(" ")[0] || nombre;

  await postResend({
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
  });
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
  const from = process.env.RESEND_FROM_EMAIL || "DIPRA <onboarding@resend.dev>";
  const primerNombre = nombre.trim().split(" ")[0] || nombre;

  await postResend({
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
  });
}
