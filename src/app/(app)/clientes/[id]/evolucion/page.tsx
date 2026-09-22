import { createClient } from "@/lib/supabase/server";
import type { PrHistorialEntry } from "@/lib/dipra/types";
import { EvolucionClient } from "./EvolucionClient";

export default async function EvolucionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: historial } = await supabase
    .from("client_pr_historial")
    .select("*")
    .eq("client_id", id)
    .order("fecha")
    .order("created_at")
    .returns<PrHistorialEntry[]>();

  return <EvolucionClient clienteId={id} historialInicial={historial ?? []} />;
}
