import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, ComposicionCorporalEntry, EvaluacionCustomEntry, MovilidadEsferaEntry } from "@/lib/dipra/types";
import { ComposicionCorporalSection } from "./ComposicionCorporalSection";
import { FmsSection } from "./FmsSection";
import { DolorAliciaSection } from "./DolorAliciaSection";
import { MovilidadEsferasSection } from "./MovilidadEsferasSection";
import { EvaluacionesCustomSection } from "./EvaluacionesCustomSection";
import { NuevaMedicionForm } from "../evolucion/NuevaMedicionForm";

export default async function EvaluacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cliente }, { data: composicion }, { data: movilidad }, { data: evaluacionesCustom }] =
    await Promise.all([
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
    ]);

  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ComposicionCorporalSection clienteId={cliente.id} initialItems={composicion ?? []} />

      <section className="dp-surface rounded-2xl p-5 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-medium dp-text-heading">Evaluación de rendimiento</h2>
          <Link href={`/clientes/${cliente.id}/evolucion`} className="dp-text-brand text-xs font-medium hover:underline">
            Ver evolución completa →
          </Link>
        </div>
        <p className="dp-muted mb-2 text-xs">
          Saltos (CMJ/SJ), fuerza, agarre, planchas, etc. — se carga acá y queda disponible en la pestaña
          Evolución.
        </p>
        <NuevaMedicionForm clienteId={cliente.id} tituloBoton="+ Cargar evaluación de rendimiento" />
      </section>

      <FmsSection clienteId={cliente.id} initialFms={cliente.fms} />
      <DolorAliciaSection clienteId={cliente.id} initialDolorAlicia={cliente.dolor_alicia ?? {}} />
      <MovilidadEsferasSection clienteId={cliente.id} initialItems={movilidad ?? []} />
      <EvaluacionesCustomSection clienteId={cliente.id} initialItems={evaluacionesCustom ?? []} />
    </div>
  );
}
