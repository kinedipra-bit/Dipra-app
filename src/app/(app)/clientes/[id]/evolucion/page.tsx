import { createClient } from "@/lib/supabase/server";
import type { MetricaExtra, PrHistorialEntry } from "@/lib/dipra/types";
import { EvolucionClient } from "./EvolucionClient";

export default async function EvolucionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: historial }, { data: metricasExtra }] = await Promise.all([
    supabase
      .from("client_pr_historial")
      .select("*")
      .eq("client_id", id)
      .order("fecha")
      .order("created_at")
      .returns<PrHistorialEntry[]>(),
    supabase
      .from("metricas_rendimiento_extra")
      .select("*")
      .or(`cliente_id.is.null,cliente_id.eq.${id}`)
      .order("created_at")
      .returns<MetricaExtra[]>(),
  ]);

  return (
    <EvolucionClient
      clienteId={id}
      historialInicial={historial ?? []}
      metricasExtraIniciales={metricasExtra ?? []}
    />
  );
}
