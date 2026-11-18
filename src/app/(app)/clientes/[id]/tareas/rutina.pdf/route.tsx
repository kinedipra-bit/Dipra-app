import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import type { DiaPlan } from "@/lib/dipra/types";
import { RutinaPdfDocument } from "../RutinaPdfDocument";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cliente }, { data: plan }] = await Promise.all([
    supabase.from("clients").select("nombre").eq("id", id).single<{ nombre: string }>(),
    supabase
      .from("plan_kine")
      .select("dias, dias_publicado, indicaciones_texto")
      .eq("client_id", id)
      .single<{ dias: DiaPlan[]; dias_publicado: DiaPlan[] | null; indicaciones_texto: string }>(),
  ]);

  if (!cliente || !plan) {
    return new Response("No se encontró el plan de este cliente.", { status: 404 });
  }

  // La versión que el cliente YA vio (dias_publicado) si existe — es la que
  // efectivamente se le dejó, no un borrador a medio editar.
  const dias = plan.dias_publicado ?? plan.dias;

  const links = Array.from(
    new Set(
      dias.flatMap((d) => d.bloques.flatMap((b) => b.exercises)).map((e) => e.link.trim()).filter(Boolean)
    )
  );
  const qrPorLink = new Map(
    await Promise.all(links.map(async (link) => [link, await QRCode.toDataURL(link, { margin: 0, width: 120 })] as const))
  );

  const buffer = await renderToBuffer(
    <RutinaPdfDocument
      clienteNombre={cliente.nombre}
      dias={dias}
      indicacionesTexto={plan.indicaciones_texto}
      qrPorLink={qrPorLink}
    />
  );

  const nombreArchivo = cliente.nombre.trim().replace(/\s+/g, "_");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rutina-${nombreArchivo}.pdf"`,
    },
  });
}
