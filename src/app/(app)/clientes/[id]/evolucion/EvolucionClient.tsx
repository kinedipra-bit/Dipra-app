"use client";

import { useState, useTransition } from "react";
import { DEFICIT_EXPLOSIVO_INFO, deficitExplosivo, perfilDeficitExplosivo } from "@/lib/dipra/calc";
import type { MetricaExtra, PrHistorialEntry } from "@/lib/dipra/types";
import { eliminarPrHistorial } from "./actions";
import { NuevaMedicionForm } from "./NuevaMedicionForm";
import { MetricTimeline } from "./MetricTimeline";
import { GRUPOS } from "./metricas";

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime())
    ? f
    : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
}

export function EvolucionClient({
  clienteId,
  historialInicial,
  metricasExtraIniciales,
}: {
  clienteId: string;
  historialInicial: PrHistorialEntry[];
  metricasExtraIniciales: MetricaExtra[];
}) {
  const hist = [...historialInicial].sort((a, b) => a.fecha.localeCompare(b.fecha));

  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [metricasExtra, setMetricasExtra] = useState(metricasExtraIniciales);

  const borrar = (id: string) => {
    if (!confirm("¿Eliminar este registro de mesociclo? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    startTransition(async () => {
      await eliminarPrHistorial(clienteId, id);
      setDeletingId(null);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <NuevaMedicionForm
        clienteId={clienteId}
        metricasExtraIniciales={metricasExtra}
        onMetricasExtraChange={setMetricasExtra}
      />

      {hist.length === 0 ? (
        <p className="dp-muted dp-surface rounded-2xl p-8 text-center text-sm shadow-sm">
          Todavía no hay marcas registradas para este cliente.
        </p>
      ) : (
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <h3 className="dp-text-heading mb-1 font-medium">Evolución de marcas</h3>
          <p className="dp-muted mb-3 text-xs">
            El eje muestra el tiempo real entre mediciones — las franjas marcan la fase (mesociclo/objetivo) vigente
            en cada momento. Tocá un punto para ver el detalle exacto.
          </p>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {hist.map((h) => (
              <div key={h.id} className="dp-bg-faint flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px]">
                <span className="dp-muted font-mono">{fmtFecha(h.fecha)}</span>
                <span className="dp-text-heading font-medium">{h.mesociclo}</span>
                {h.objetivo && <span className="dp-text-brand">· {h.objetivo}</span>}
                <button
                  type="button"
                  onClick={() => borrar(h.id)}
                  disabled={pending && deletingId === h.id}
                  className="dp-muted hover:dp-alert disabled:opacity-50"
                >
                  {pending && deletingId === h.id ? "…" : "✕"}
                </button>
              </div>
            ))}
          </div>

          {GRUPOS.map((g) => (
            <div key={g.titulo} className="mb-6 last:mb-0">
              <div className="mb-2 flex items-center justify-between">
                <p className="dp-text-brand text-xs font-semibold uppercase tracking-wide">{g.titulo}</p>
                {g.titulo === "Saltos" && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {hist.map((h) => {
                      const deficit = deficitExplosivo(h.cmj, h.squat_jump);
                      if (deficit === null) return null;
                      const perfil = perfilDeficitExplosivo(deficit);
                      const info = DEFICIT_EXPLOSIVO_INFO[perfil];
                      return (
                        <span
                          key={h.id}
                          title={`${h.mesociclo}: (CMJ-SJ)/SJ — ${info.label}`}
                          className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-medium text-white ${
                            info.tono === "amber" ? "dp-bg-amber" : "dp-bg-brand"
                          }`}
                        >
                          Déficit expl. {deficit.toFixed(0)}%
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {g.titulo === "Saltos" &&
                (() => {
                  // Perfil del déficit explosivo de la medición más reciente —
                  // los 3 perfiles (DEFICIT_EXPLOSIVO_INFO) son lecturas, no un
                  // binario bueno/malo, así que siempre se muestra la
                  // interpretación vigente, no solo cuando "está mal".
                  const ultimaConDeficit = [...hist].reverse().find((h) => deficitExplosivo(h.cmj, h.squat_jump) !== null);
                  if (!ultimaConDeficit) return null;
                  const deficit = deficitExplosivo(ultimaConDeficit.cmj, ultimaConDeficit.squat_jump);
                  if (deficit === null) return null;
                  const info = DEFICIT_EXPLOSIVO_INFO[perfilDeficitExplosivo(deficit)];
                  const claseFondo = info.tono === "amber" ? "dp-bg-amber-soft" : "dp-bg-brand-soft";
                  const claseTexto = info.tono === "amber" ? "dp-text-amber" : "dp-text-brand";
                  return (
                    <div className={`${claseFondo} mb-2 rounded-lg px-3 py-2 text-[11px]`}>
                      <p className={`${claseTexto} font-semibold`}>
                        {info.rango} · {info.label} ({ultimaConDeficit.mesociclo})
                      </p>
                      <p className="dp-body mt-0.5">{info.interpretacion}</p>
                      <p className="dp-body mt-0.5">
                        <span className="font-medium">Orientación: </span>
                        {info.orientacion}
                      </p>
                      <p className="dp-muted mt-1 text-[10px]">
                        El déficit no mide la explosividad directamente — cruzá este porcentaje con la altura
                        absoluta de CMJ y SJ, no lo tomes como diagnóstico aislado.
                      </p>
                    </div>
                  );
                })()}
              <div className="flex flex-col gap-5 overflow-x-auto">
                {g.metrics.map((m) => (
                  <MetricTimeline key={m.key} hist={hist} metricKey={m.key} label={m.label} />
                ))}
              </div>
            </div>
          ))}

          {metricasExtra.length > 0 && (
            <div className="mb-6 last:mb-0">
              <p className="dp-text-brand mb-2 text-xs font-semibold uppercase tracking-wide">Personalizados</p>
              <div className="flex flex-col gap-5 overflow-x-auto">
                {metricasExtra.map((m) => (
                  <MetricTimeline key={m.id} hist={hist} extraId={m.id} label={m.label} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
