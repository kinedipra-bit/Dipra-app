import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  BateriaAdultoMayorEntry,
  Cliente,
  ComposicionCorporalEntry,
  EpisodioHistorialEntry,
  EvaluacionCustomEntry,
  FmsHistorialEntry,
  MetricaExtra,
  MovilidadArticularEntry,
  MovilidadEsferaEntry,
} from "@/lib/dipra/types";
import { EpisodiosSection } from "./EpisodiosSection";
import { PilaresSection } from "./PilaresSection";
import { ComposicionCorporalSection } from "./ComposicionCorporalSection";
import { FmsSection } from "./FmsSection";
import { MovilidadEsferasSection } from "./MovilidadEsferasSection";
import { MovilidadArticularSection } from "./MovilidadArticularSection";
import { BateriaAdultoMayorSection } from "./BateriaAdultoMayorSection";
import { EvaluacionesCustomSection } from "./EvaluacionesCustomSection";
import { DiagnosticoKinesicoSection } from "./DiagnosticoKinesicoSection";
import { NuevaMedicionForm } from "../evolucion/NuevaMedicionForm";
import { EvaluacionTabs } from "./EvaluacionTabs";

export default async function EvaluacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: cliente },
    { data: composicion },
    { data: fmsHistorial },
    { data: episodios },
    { data: movilidad },
    { data: evaluacionesCustom },
    { data: metricasExtra },
    { data: movilidadArticular },
    { data: bateriaAdultoMayor },
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single<Cliente>(),
    supabase
      .from("client_composicion_corporal")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .returns<ComposicionCorporalEntry[]>(),
    supabase
      .from("client_fms_historial")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .returns<FmsHistorialEntry[]>(),
    supabase
      .from("client_episodios_historial")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .returns<EpisodioHistorialEntry[]>(),
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
      .from("metricas_rendimiento_extra")
      .select("*")
      .or(`cliente_id.is.null,cliente_id.eq.${id}`)
      .order("created_at")
      .returns<MetricaExtra[]>(),
    supabase
      .from("client_movilidad_articular_historial")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .returns<MovilidadArticularEntry[]>(),
    supabase
      .from("client_bateria_adulto_mayor")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .returns<BateriaAdultoMayorEntry[]>(),
  ]);

  if (!cliente) notFound();

  return (
    <EvaluacionTabs
      secciones={{
        clinico: (
          <>
            <EpisodiosSection clienteId={cliente.id} initialItems={episodios ?? []} />
            <PilaresSection clienteId={cliente.id} initialPilares={cliente.pilares} />
            <DiagnosticoKinesicoSection clienteId={cliente.id} initialDiagnostico={cliente.diagnostico_kinesico} />
          </>
        ),
        composicion: (
          <ComposicionCorporalSection clienteId={cliente.id} initialItems={composicion ?? []} />
        ),
        movilidad: (
          <>
            <FmsSection clienteId={cliente.id} initialItems={fmsHistorial ?? []} />
            <MovilidadEsferasSection clienteId={cliente.id} initialItems={movilidad ?? []} />
            <MovilidadArticularSection clienteId={cliente.id} initialItems={movilidadArticular ?? []} />
          </>
        ),
        rendimiento: (
          <>
            <section className="dp-surface rounded-2xl p-5 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-medium dp-text-heading">Evaluación de rendimiento</h2>
                <Link
                  href={`/clientes/${cliente.id}/evolucion`}
                  className="dp-text-brand text-xs font-medium hover:underline"
                >
                  Ver evolución completa →
                </Link>
              </div>
              <p className="dp-muted mb-2 text-xs">
                Saltos (CMJ/SJ), fuerza, agarre, planchas, etc. — se carga acá y queda disponible en la
                pestaña Evolución.
              </p>
              <NuevaMedicionForm
                clienteId={cliente.id}
                tituloBoton="+ Cargar evaluación de rendimiento"
                metricasExtraIniciales={metricasExtra ?? []}
              />
            </section>
            <BateriaAdultoMayorSection clienteId={cliente.id} initialItems={bateriaAdultoMayor ?? []} />
          </>
        ),
        libres: (
          <EvaluacionesCustomSection clienteId={cliente.id} initialItems={evaluacionesCustom ?? []} />
        ),
      }}
    />
  );
}
