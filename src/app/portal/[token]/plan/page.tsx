import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente, PlanSemana } from "@/lib/dipra/types";
import { PortalPlanView } from "./PortalPlanView";

export default async function PortalPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: cliente } = await admin
    .from("clients")
    .select("semana_activa_id")
    .eq("portal_token", token)
    .single<Pick<Cliente, "semana_activa_id">>();

  if (!cliente?.semana_activa_id) {
    return <p className="dp-muted text-sm">Todavía no tenés una rutina asignada.</p>;
  }

  const { data: semana } = await admin
    .from("plan_semanas")
    .select("*")
    .eq("id", cliente.semana_activa_id)
    .single<PlanSemana>();

  if (!semana) {
    return <p className="dp-muted text-sm">Todavía no tenés una rutina asignada.</p>;
  }

  return <PortalPlanView token={token} semana={semana} />;
}
