import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mandarPushACliente } from "@/lib/push";

// Corre una vez al día (ver vercel.json) y manda el recordatorio "hoy
// entrenás" a cada cliente que confirmó la fecha de HOY en su mini
// calendario del portal (ver portal/[token]/sesiones/MiniCalendarioEntrenamiento.tsx)
// y tiene notificaciones push activadas — a quien no activó push, no le
// llega nada (no hay otro canal todavía).
function fechaHoyChile(): string {
  // Vercel corre el cron en UTC — Chile no comparte fecha con UTC durante
  // buena parte del día, así que la fecha de "hoy" se calcula en su propia
  // zona horaria en vez de usar la fecha del servidor directo.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const hoy = fechaHoyChile();

  const { data: dias, error } = await admin
    .from("client_dias_entrenamiento")
    .select("client_id, clients(nombre, portal_token)")
    .eq("fecha", hoy)
    .returns<{ client_id: string; clients: { nombre: string; portal_token: string } | null }[]>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let clientesAvisados = 0;
  await Promise.all(
    (dias ?? []).map(async (d) => {
      if (!d.clients) return;
      const primerNombre = d.clients.nombre.trim().split(" ")[0] || d.clients.nombre;
      const { enviadas } = await mandarPushACliente(d.client_id, {
        title: "Hoy entrenás 💪",
        body: `${primerNombre}, hoy es uno de los días que marcaste para entrenar.`,
        url: `/portal/${d.clients.portal_token}/sesiones`,
      });
      if (enviadas > 0) clientesAvisados++;
    })
  );

  return NextResponse.json({ fecha: hoy, confirmados: dias?.length ?? 0, clientesAvisados });
}
