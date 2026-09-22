import { createClient } from "@/lib/supabase/server";
import type { DiaPlan, Sesion } from "@/lib/dipra/types";
import { SesionesClient } from "./SesionesClient";

export default async function SesionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sesiones }, { data: cliente }, { data: semanas }] = await Promise.all([
    supabase
      .from("sesiones")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<Sesion[]>(),
    supabase.from("clients").select("semana_activa_id").eq("id", id).single<{ semana_activa_id: string | null }>(),
    supabase
      .from("plan_semanas")
      .select("id, numero, dias")
      .eq("client_id", id)
      .order("numero")
      .returns<{ id: string; numero: number; dias: DiaPlan[] }[]>(),
  ]);

  const semanaActiva =
    semanas?.find((s) => s.id === cliente?.semana_activa_id) ?? semanas?.[0] ?? null;

  return (
    <SesionesClient
      clienteId={id}
      sesionesIniciales={sesiones ?? []}
      diasPlan={semanaActiva?.dias ?? []}
    />
  );
}
