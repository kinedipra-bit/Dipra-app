import { calcVolumenBloque, calcVolumenDia } from "@/lib/dipra/calc";
import type { DiaPlan } from "@/lib/dipra/types";

// Migrado desde BarraDeCarga (dipra-app.jsx líneas 705-734). Los tonos de
// bloque usan los tokens de color ya definidos en globals.css; el original
// tenía un 4to tono hexadecimal (#7FA79E) sin token equivalente acá, así que
// se usa var(--dp-muted) en su lugar para no introducir un color nuevo
// fuera del set dp-* existente (no se toca globals.css, es de otra carpeta).
const BLOCK_TONES = ["var(--dp-brand)", "var(--dp-amber)", "var(--dp-body)", "var(--dp-muted)"];

export function BarraDeCarga({ dias, compact = false }: { dias: DiaPlan[]; compact?: boolean }) {
  const volumenes = dias.map((d) => ({
    label: d.label,
    total: calcVolumenDia(d),
    bloques: d.bloques.map((b) => ({ title: b.title, v: calcVolumenBloque(b) })),
  }));
  const max = Math.max(1, ...volumenes.map((v) => v.total));

  return (
    <div className={`grid grid-cols-4 gap-3 ${compact ? "" : "mt-2"}`}>
      {volumenes.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <div className="dp-bg-faint flex h-28 w-full flex-col-reverse overflow-hidden rounded-lg">
            {v.bloques.map((b, bi) =>
              b.v > 0 ? (
                <div
                  key={bi}
                  style={{
                    height: `${v.total > 0 ? (b.v / max) * 100 : 0}%`,
                    background: BLOCK_TONES[bi % BLOCK_TONES.length],
                  }}
                  title={`${b.title}: ${b.v.toLocaleString("es-CL")} kg`}
                />
              ) : null
            )}
          </div>
          <span className="dp-body text-[11px] font-medium">{v.label}</span>
          <span className="dp-ink font-mono text-xs font-semibold">{v.total.toLocaleString("es-CL")} kg</span>
        </div>
      ))}
    </div>
  );
}
