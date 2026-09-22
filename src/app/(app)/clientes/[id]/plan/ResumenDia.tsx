import { calcVolumenDia } from "@/lib/dipra/calc";
import type { DiaPlan } from "@/lib/dipra/types";

// Migrado desde ResumenDia (dipra-app.jsx líneas 661-703).
export function ResumenDia({ dia }: { dia: DiaPlan }) {
  const vol = calcVolumenDia(dia);
  return (
    <div className="dp-surface rounded-2xl p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="dp-text-heading font-[family-name:var(--font-display)] font-semibold">{dia.label}</h3>
          {dia.foco && <p className="dp-muted text-xs">{dia.foco}</p>}
        </div>
        <span className="dp-muted font-mono text-xs">{vol.toLocaleString("es-CL")} kg vol. total</span>
      </div>
      <div className="space-y-4">
        {dia.bloques.map((b) => (
          <div key={b.id}>
            <p className="dp-text-brand mb-1 text-xs font-semibold tracking-wide uppercase">{b.title}</p>
            {b.exercises.length === 0 ? (
              <p className="dp-muted text-xs">Sin ejercicios.</p>
            ) : (
              <div className="divide-y divide-black/5">
                {b.exercises.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-1.5">
                    <div className="min-w-0">
                      {e.link ? (
                        <a
                          href={e.link}
                          target="_blank"
                          rel="noreferrer"
                          className="dp-text-brand block truncate text-sm underline"
                        >
                          {e.nombre}
                        </a>
                      ) : (
                        <span className="dp-ink block truncate text-sm">{e.nombre}</span>
                      )}
                      {e.comentarioCliente && (
                        <p className="dp-text-amber mt-0.5 text-[11px]">&ldquo;{e.comentarioCliente}&rdquo;</p>
                      )}
                    </div>
                    <span className="dp-muted shrink-0 text-right font-mono text-xs">
                      {e.series}×{e.reps}×{e.kg}kg
                      {e.rpe ? ` · RPE ${e.rpe}` : ""}
                      {e.rir ? ` · RIR ${e.rir}` : ""}
                      {e.tut ? ` · TUT ${e.tut}` : ""}
                      {e.descanso ? ` · Desc. ${e.descanso}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
