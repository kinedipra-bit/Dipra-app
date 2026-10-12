import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { enmascararCorreo } from "@/lib/dipra/portalPin";
import type { PlanSemana } from "@/lib/dipra/types";
import { obtenerClientePortal, sesionValidaPara } from "../acceso";
import { PortalAcceso } from "../PortalAcceso";
import { PortalNuevaSesionForm } from "./PortalNuevaSesionForm";
import { MiniCalendarioEntrenamiento } from "./MiniCalendarioEntrenamiento";
import { obtenerDiasConfirmados } from "./actions";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function PortalSesionesPage({ params }: { params: Promise<{ token: string }> }) {
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

  const [{ data: semana }, diasConfirmados] = await Promise.all([
    cliente.semana_activa_id
      ? admin
          .from("plan_semanas")
          .select("dias_publicado")
          .eq("id", cliente.semana_activa_id)
          .single<Pick<PlanSemana, "dias_publicado">>()
      : Promise.resolve({ data: null }),
    obtenerDiasConfirmados(cliente.id, toISODate(new Date())),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <MiniCalendarioEntrenamiento
        token={token}
        diasConfirmadosIniciales={diasConfirmados.map((d) => d.fecha)}
      />

      <PortalNuevaSesionForm token={token} dias={semana?.dias_publicado ?? []} />

      <p className="dp-muted text-center text-xs">
        ¿Querés ver lo que ya entrenaste?{" "}
        <Link href={`/portal/${token}/historico`} className="dp-text-brand hover:underline">
          Ver histórico →
        </Link>
      </p>
    </div>
  );
}
