import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { enmascararCorreo } from "@/lib/dipra/portalPin";
import type { PlanKine } from "@/lib/dipra/types";
import { obtenerClientePortal, sesionValidaPara } from "../acceso";
import { PortalAcceso } from "../PortalAcceso";
import { PortalTareasView } from "./PortalTareasView";

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
  const { data: plan } = await admin
    .from("plan_kine")
    .select("dias_publicado")
    .eq("client_id", cliente.id)
    .maybeSingle<Pick<PlanKine, "dias_publicado">>();

  if (!plan?.dias_publicado || plan.dias_publicado.length === 0) {
    return <p className="dp-muted text-sm">Todavía no tenés tareas de kinesiología asignadas.</p>;
  }

  return <PortalTareasView token={token} dias={plan.dias_publicado} />;
}
