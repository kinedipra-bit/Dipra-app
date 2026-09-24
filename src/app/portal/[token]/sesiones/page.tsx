import { createAdminClient } from "@/lib/supabase/admin";
import { PILARES_KEYS } from "@/lib/dipra/constants";
import { EscalaUnoADiez } from "@/app/(app)/clientes/[id]/sesiones/EscalaUnoADiez";
import type { Cliente, PlanSemana, Sesion } from "@/lib/dipra/types";
import { PortalNuevaSesionForm } from "./PortalNuevaSesionForm";
import { EliminarSesionButton } from "./EliminarSesionButton";

export default async function PortalSesionesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: cliente } = await admin
    .from("clients")
    .select("id, semana_activa_id")
    .eq("portal_token", token)
    .single<Pick<Cliente, "id" | "semana_activa_id">>();
  if (!cliente) return <p className="dp-muted text-sm">Link inválido.</p>;

  const [{ data: sesiones }, { data: semana }] = await Promise.all([
    admin
      .from("sesiones")
      .select("*")
      .eq("client_id", cliente.id)
      .order("fecha", { ascending: false })
      .returns<Sesion[]>(),
    cliente.semana_activa_id
      ? admin.from("plan_semanas").select("dias").eq("id", cliente.semana_activa_id).single<Pick<PlanSemana, "dias">>()
      : Promise.resolve({ data: null }),
  ]);

  const diasLabels = semana?.dias.map((d) => d.label) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PortalNuevaSesionForm token={token} diasLabels={diasLabels} />

      {(!sesiones || sesiones.length === 0) && (
        <p className="dp-muted text-sm">Todavía no hay sesiones registradas.</p>
      )}

      {sesiones?.map((s) => (
        <div key={s.id} className="dp-surface rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="dp-text-heading font-medium">{s.tipo}</p>
            <div className="flex items-center gap-3">
              <p className="dp-muted font-mono text-xs">{s.fecha}</p>
              <EliminarSesionButton token={token} sesionId={s.id} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4">
            {PILARES_KEYS.map((p) => (
              <div key={p.key} className="flex flex-col gap-1">
                <span className="dp-muted text-[10px] font-medium">{p.label}</span>
                <EscalaUnoADiez
                  value={s.pilares[p.key as keyof typeof s.pilares] ?? ""}
                  invertido={"invertido" in p ? p.invertido : false}
                  readOnly
                />
              </div>
            ))}
          </div>

          {s.comentarios && <p className="dp-body mt-3 text-sm">{s.comentarios}</p>}
        </div>
      ))}
    </div>
  );
}
