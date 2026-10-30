import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { enmascararCorreo } from "@/lib/dipra/portalPin";
import type { CheckinDiario, PlanKine } from "@/lib/dipra/types";
import { obtenerClientePortal, sesionValidaPara } from "../acceso";
import { PortalAcceso } from "../PortalAcceso";
import { AyudaSeccion } from "../AyudaSeccion";
import { PortalTareasView } from "./PortalTareasView";
import { CheckinDiarioCard } from "./CheckinDiarioCard";

function hoyISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}

export default async function PortalTareasPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cliente = await obtenerClientePortal(token);
  if (!cliente) notFound();

  if (!(await sesionValidaPara(cliente.id))) {
    return (
      <PortalAcceso
        token={token}
        nombre={cliente.nombre}
        correoEnmascarado={cliente.correo ? enmascararCorreo(cliente.correo) : ""}
        pinConfigurado={!!cliente.pinHash}
      />
    );
  }

  const admin = createAdminClient();
  const [{ data: plan }, { data: checkinsHoy }, { data: checkinDiarioHoy }] = await Promise.all([
    admin
      .from("plan_kine")
      .select("dias_publicado, indicaciones_texto, indicaciones_pdf_path, indicaciones_pdf_nombre")
      .eq("client_id", cliente.id)
      .maybeSingle<
        Pick<PlanKine, "dias_publicado" | "indicaciones_texto" | "indicaciones_pdf_path" | "indicaciones_pdf_nombre">
      >(),
    admin.from("client_tareas_checkins").select("dia_id").eq("client_id", cliente.id).eq("fecha", hoyISO()),
    admin
      .from("client_checkins_diarios")
      .select("*")
      .eq("client_id", cliente.id)
      .eq("fecha", hoyISO())
      .maybeSingle<CheckinDiario>(),
  ]);

  const indicacionesPdfUrl = plan?.indicaciones_pdf_path
    ? admin.storage.from("indicaciones").getPublicUrl(plan.indicaciones_pdf_path).data.publicUrl
    : null;
  const hayDias = !!plan?.dias_publicado && plan.dias_publicado.length > 0;
  const hayIndicaciones = !!(plan?.indicaciones_texto || indicacionesPdfUrl);

  return (
    <div className="flex flex-col gap-4">
      <AyudaSeccion>
        Acá están las tareas y ejercicios de kinesiología que te dejó tu profesional para hacer por tu
        cuenta, más cualquier indicación o PDF que te haya compartido.
      </AyudaSeccion>
      <CheckinDiarioCard token={token} checkinInicial={checkinDiarioHoy ?? null} />
      {!hayDias && !hayIndicaciones ? (
        <p className="dp-muted text-sm">Todavía no tenés tareas de kinesiología asignadas.</p>
      ) : (
        <PortalTareasView
          token={token}
          dias={plan?.dias_publicado ?? []}
          indicacionesTexto={plan?.indicaciones_texto ?? ""}
          indicacionesPdfUrl={indicacionesPdfUrl}
          indicacionesPdfNombre={plan?.indicaciones_pdf_nombre ?? null}
          diasHechosHoyIniciales={(checkinsHoy ?? []).map((c) => c.dia_id)}
        />
      )}
    </div>
  );
}
