import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { enmascararCorreo } from "@/lib/dipra/portalPin";
import type { PlanSemana, Sesion } from "@/lib/dipra/types";
import { obtenerClientePortal, sesionValidaPara } from "../acceso";
import { PortalAcceso } from "../PortalAcceso";
import { PortalPlanView } from "./PortalPlanView";

export default async function PortalPlanPage({ params }: { params: Promise<{ token: string }> }) {
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

  if (!cliente.semana_activa_id) {
    return <p className="dp-muted text-sm">Todavía no tenés una rutina asignada.</p>;
  }

  const [{ data: semana }, { data: sesiones }] = await Promise.all([
    admin.from("plan_semanas").select("*").eq("id", cliente.semana_activa_id).single<PlanSemana>(),
    admin.from("sesiones").select("*").eq("client_id", cliente.id).returns<Sesion[]>(),
  ]);

  if (!semana) {
    return <p className="dp-muted text-sm">Todavía no tenés una rutina asignada.</p>;
  }

  return <PortalPlanView token={token} semana={semana} sesiones={sesiones ?? []} />;
}
