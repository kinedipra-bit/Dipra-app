import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente, PlanSemana } from "@/lib/dipra/types";
import { PortalNuevaSesionForm } from "./PortalNuevaSesionForm";

export default async function PortalSesionesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: cliente } = await admin
    .from("clients")
    .select("id, semana_activa_id")
    .eq("portal_token", token)
    .single<Pick<Cliente, "id" | "semana_activa_id">>();
  if (!cliente) return <p className="dp-muted text-sm">Link inválido.</p>;

  const { data: semana } = cliente.semana_activa_id
    ? await admin.from("plan_semanas").select("dias").eq("id", cliente.semana_activa_id).single<Pick<PlanSemana, "dias">>()
    : { data: null };

  return (
    <div className="flex flex-col gap-4">
      <PortalNuevaSesionForm token={token} dias={semana?.dias ?? []} />

      <p className="dp-muted text-center text-xs">
        ¿Querés ver lo que ya entrenaste?{" "}
        <Link href={`/portal/${token}/historico`} className="dp-text-brand hover:underline">
          Ver histórico →
        </Link>
      </p>
    </div>
  );
}
