import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente, PlanSemana, Sesion } from "@/lib/dipra/types";
import { PortalPlanView } from "./PortalPlanView";

export default async function PortalPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: cliente } = await admin
    .from("clients")
    .select("id, semana_activa_id")
    .eq("portal_token", token)
    .single<Pick<Cliente, "id" | "semana_activa_id">>();

  if (!cliente?.semana_activa_id) {
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
