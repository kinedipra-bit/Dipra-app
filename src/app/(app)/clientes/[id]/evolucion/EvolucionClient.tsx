"use client";

import { useState, useTransition } from "react";
import { deficitExplosivo } from "@/lib/dipra/calc";
import type { PrHistorialEntry } from "@/lib/dipra/types";
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
}: {
  clienteId: string;
  historialInicial: PrHistorialEntry[];
}) {
  const hist = [...historialInicial].sort((a, b) => a.fecha.localeCompare(b.fecha));

  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      <NuevaMedicionForm clienteId={clienteId} />

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
                      const bajo = deficit < 15;
                      return (
                        <span
                          key={h.id}
                          title={`${h.mesociclo}: (CMJ-SJ)/SJ`}
                          className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-medium text-white ${
                            bajo ? "dp-bg-alert" : "dp-bg-brand"
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
                hist.some((h) => {
                  const d = deficitExplosivo(h.cmj, h.squat_jump);
                  return d !== null && d < 15;
                }) && (
                  <p className="dp-alert mb-2 text-[11px]">
                    ⚠ Déficit explosivo bajo 15% — el CMJ casi no mejora al SJ, sugiere poco aprovechamiento del
                    ciclo de estiramiento-acortamiento (foco en trabajo pliométrico/reactivo).
                  </p>
                )}
              <div className="flex flex-col gap-5 overflow-x-auto">
                {g.metrics.map((m) => (
                  <MetricTimeline key={m.key} hist={hist} metricKey={m.key} label={m.label} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
