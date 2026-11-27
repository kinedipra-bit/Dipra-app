import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularFinalesFms, totalFms, imc } from "@/lib/dipra/calc";
import { PILARES_DESCRIPTIVOS_CAMPOS, ALICIA_CAMPOS } from "@/lib/dipra/constants";
import type {
  BateriaAdultoMayorEntry,
  Cliente,
  ComposicionCorporalEntry,
  EpisodioHistorialEntry,
  EvaluacionCustomEntry,
  FmsHistorialEntry,
  PrHistorialEntry,
  PruebaEspecialEntry,
} from "@/lib/dipra/types";

function fmtFecha(f: string | null | undefined) {
  if (!f) return null;
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime())
    ? f
    : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
}

function Card({
  titulo,
  href,
  children,
}: {
  titulo: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="dp-surface flex flex-col gap-2 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium dp-text-heading">{titulo}</h2>
        <Link href={href} className="dp-text-brand shrink-0 text-xs font-medium hover:underline">
          Ver más →
        </Link>
      </div>
      {children}
    </section>
  );
}

export default async function ResumenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: cliente },
    { data: episodio },
    { data: composicion },
    { data: fms },
    { data: pruebaEspecial },
    { data: evaluacionesCustom },
    { data: rendimiento },
    { data: bateria },
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single<Cliente>(),
    supabase
      .from("client_episodios_historial")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle<EpisodioHistorialEntry>(),
    supabase
      .from("client_composicion_corporal")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle<ComposicionCorporalEntry>(),
    supabase
      .from("client_fms_historial")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle<FmsHistorialEntry>(),
    supabase
      .from("client_pruebas_especiales_historial")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle<PruebaEspecialEntry>(),
    supabase
      .from("client_evaluaciones_custom")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .returns<EvaluacionCustomEntry[]>(),
    supabase
      .from("client_pr_historial")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle<PrHistorialEntry>(),
    supabase
      .from("client_bateria_adulto_mayor")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle<BateriaAdultoMayorEntry>(),
  ]);

  if (!cliente) notFound();

  const pilaresConContenido = PILARES_DESCRIPTIVOS_CAMPOS.filter(
    (p) => cliente.pilares[p.key as keyof typeof cliente.pilares]?.trim()
  );
  const fmsTotal = fms ? totalFms(calcularFinalesFms(fms.fms)) : null;
  const aliciaConContenido = episodio
    ? ALICIA_CAMPOS.filter((c) => episodio.dolor_alicia[c.key]?.trim())
    : [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card titulo="Datos básicos" href={`/clientes/${id}/ficha`}>
        <p className="dp-body text-sm">
          {cliente.categoria || "Sin categoría"}
          {cliente.ocupacion && ` · ${cliente.ocupacion}`}
        </p>
        {cliente.objetivo && <p className="dp-muted text-xs">Objetivo: {cliente.objetivo}</p>}
        <p className="dp-muted text-xs">Cliente desde {fmtFecha(cliente.inicio)}</p>
      </Card>

      <Card titulo="Pilares del rendimiento" href={`/clientes/${id}/evaluacion`}>
        {pilaresConContenido.length === 0 ? (
          <p className="dp-muted text-xs">Sin cargar todavía.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {pilaresConContenido.map((p) => (
              <p key={p.key} className="dp-body text-xs">
                <span className="font-medium">{p.label}:</span>{" "}
                <span className="dp-muted">
                  {cliente.pilares[p.key as keyof typeof cliente.pilares].slice(0, 80)}
                </span>
              </p>
            ))}
          </div>
        )}
      </Card>

      <Card titulo="Último episodio · Motivo de consulta (ALICIA)" href={`/clientes/${id}/evaluacion`}>
        {!episodio ? (
          <p className="dp-muted text-xs">Sin episodios registrados todavía.</p>
        ) : (
          <>
            <p className="dp-muted font-mono text-[11px]">{fmtFecha(episodio.fecha)}</p>
            {episodio.motivo_consulta && <p className="dp-body text-sm">{episodio.motivo_consulta}</p>}
            {aliciaConContenido.length > 0 && (
              <p className="dp-muted text-xs">
                {aliciaConContenido.map((c) => `${c.label}: ${episodio.dolor_alicia[c.key]}`).join(" · ")}
              </p>
            )}
          </>
        )}
      </Card>

      <Card titulo="Diagnóstico kinésico" href={`/clientes/${id}/evaluacion`}>
        {cliente.diagnostico_kinesico ? (
          <p className="dp-body text-sm">{cliente.diagnostico_kinesico}</p>
        ) : (
          <p className="dp-muted text-xs">Sin diagnóstico cargado.</p>
        )}
      </Card>

      <Card titulo="Composición corporal" href={`/clientes/${id}/evaluacion`}>
        {!composicion ? (
          <p className="dp-muted text-xs">Sin mediciones registradas todavía.</p>
        ) : (
          <>
            <p className="dp-muted font-mono text-[11px]">{fmtFecha(composicion.fecha)}</p>
            <p className="dp-body text-sm">
              {composicion.peso ?? "—"} kg · {composicion.talla ?? "—"} cm
              {composicion.talla && composicion.peso && ` · IMC ${imc(composicion.talla, composicion.peso)}`}
              {composicion.grasa_pct !== null && ` · ${composicion.grasa_pct}% grasa`}
            </p>
          </>
        )}
      </Card>

      <Card titulo="FMS" href={`/clientes/${id}/evaluacion`}>
        {!fms ? (
          <p className="dp-muted text-xs">Sin evaluaciones FMS todavía.</p>
        ) : (
          <>
            <p className="dp-muted font-mono text-[11px]">{fmtFecha(fms.fecha)}</p>
            <p className="dp-body text-sm">
              {fmsTotal}
              <span className="dp-muted"> / 21</span>
            </p>
          </>
        )}
      </Card>

      <Card titulo="Pruebas especiales" href={`/clientes/${id}/evaluacion`}>
        {!pruebaEspecial ? (
          <p className="dp-muted text-xs">Sin pruebas especiales todavía.</p>
        ) : (
          <>
            <p className="dp-muted font-mono text-[11px]">{fmtFecha(pruebaEspecial.fecha)}</p>
            <p className="dp-body text-xs">
              {pruebaEspecial.tobillo_der_color || pruebaEspecial.tobillo_izq_color
                ? `Tobillo: ${pruebaEspecial.tobillo_der_color ?? "—"} / ${pruebaEspecial.tobillo_izq_color ?? "—"}`
                : null}
              {(pruebaEspecial.neer_der ||
                pruebaEspecial.neer_izq ||
                pruebaEspecial.jobe_der ||
                pruebaEspecial.jobe_izq ||
                pruebaEspecial.hawkins_der ||
                pruebaEspecial.hawkins_izq) && (
                <span className="dp-alert"> · algún test de hombro dio positivo</span>
              )}
            </p>
          </>
        )}
      </Card>

      <Card titulo="Evaluaciones específicas" href={`/clientes/${id}/evaluacion`}>
        {!evaluacionesCustom || evaluacionesCustom.length === 0 ? (
          <p className="dp-muted text-xs">Sin evaluaciones específicas todavía.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {evaluacionesCustom.slice(0, 3).map((e) => (
              <p key={e.id} className="dp-body text-xs">
                <span className="font-medium">{e.nombre || "(sin nombre)"}:</span>{" "}
                <span className="dp-muted">{e.resultado || "—"}</span>
              </p>
            ))}
            {evaluacionesCustom.length > 3 && (
              <p className="dp-muted text-xs">+ {evaluacionesCustom.length - 3} más</p>
            )}
          </div>
        )}
      </Card>

      {bateria && (
        <Card titulo="Batería adulto mayor" href={`/clientes/${id}/evaluacion`}>
          <p className="dp-muted font-mono text-[11px]">{fmtFecha(bateria.fecha)}</p>
          <p className="dp-body text-sm">
            TUG {bateria.tug_segundos ?? "—"}s · Marcha {bateria.velocidad_marcha_mseg ?? "—"} m/s
          </p>
        </Card>
      )}

      <Card titulo="Rendimiento" href={`/clientes/${id}/evolucion`}>
        {!rendimiento ? (
          <p className="dp-muted text-xs">Sin registros de rendimiento todavía.</p>
        ) : (
          <>
            <p className="dp-muted font-mono text-[11px]">{fmtFecha(rendimiento.fecha)}</p>
            <p className="dp-body text-sm">
              {rendimiento.mesociclo}
              {rendimiento.objetivo && ` · ${rendimiento.objetivo}`}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
