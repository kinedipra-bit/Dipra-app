import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Cliente,
  ComposicionCorporalEntry,
  EvaluacionCustomEntry,
  MovilidadEsferaEntry,
  PrHistorialEntry,
} from "@/lib/dipra/types";
import { ComposicionCorporalSection } from "./ComposicionCorporalSection";
import { FmsSection } from "./FmsSection";
import { DolorAliciaSection } from "./DolorAliciaSection";
import { MovilidadEsferasSection } from "./MovilidadEsferasSection";
import { EvaluacionesCustomSection } from "./EvaluacionesCustomSection";
import { EvolucionClient } from "../evolucion/EvolucionClient";

export default async function EvaluacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: cliente },
    { data: composicion },
    { data: movilidad },
    { data: evaluacionesCustom },
    { data: prHistorial },
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single<Cliente>(),
    supabase
      .from("client_composicion_corporal")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .returns<ComposicionCorporalEntry[]>(),
    supabase
      .from("client_movilidad_esferas")
      .select("*")
      .eq("client_id", id)
      .order("created_at")
      .returns<MovilidadEsferaEntry[]>(),
    supabase
      .from("client_evaluaciones_custom")
      .select("*")
      .eq("client_id", id)
      .order("created_at")
      .returns<EvaluacionCustomEntry[]>(),
    supabase
      .from("client_pr_historial")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .returns<PrHistorialEntry[]>(),
  ]);

  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ComposicionCorporalSection clienteId={cliente.id} initialItems={composicion ?? []} />

      <section>
        <h2 className="mb-3 font-medium dp-text-heading">Evaluación de rendimiento</h2>
        <EvolucionClient clienteId={cliente.id} historialInicial={prHistorial ?? []} />
      </section>

      <FmsSection clienteId={cliente.id} initialFms={cliente.fms} />
      <DolorAliciaSection clienteId={cliente.id} initialDolorAlicia={cliente.dolor_alicia ?? {}} />
      <MovilidadEsferasSection clienteId={cliente.id} initialItems={movilidad ?? []} />
      <EvaluacionesCustomSection clienteId={cliente.id} initialItems={evaluacionesCustom ?? []} />
    </div>
  );
}
