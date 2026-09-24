import { alertasDescanso, resumenSetsPorCualidad } from "@/lib/dipra/tablaIntensidad";
import type { DiaPlan } from "@/lib/dipra/types";

/**
 * Resumen de programación semanal: sets totales por cualidad de fuerza
 * (sumados en todos los días de la semana activa) vs. el rango sugerido
 * por la tabla de intensidad, más un recordatorio de descanso cuando un
 * mismo grupo muscular aparece más de una vez a alta intensidad (Fuerza
 * Máxima / Potencia Máxima) en la semana. Son sugerencias generales, no
 * una validación — dependen de cada atleta.
 */
export function ResumenProgramacion({ dias }: { dias: DiaPlan[] }) {
  const resumen = resumenSetsPorCualidad(dias);
  const alertas = alertasDescanso(dias);

  if (resumen.length === 0) return null;

  return (
    <div className="dp-surface rounded-2xl p-5 shadow-sm">
      <h3 className="dp-text-heading mb-1 font-medium">Sugerencias de programación semanal</h3>
      <p className="dp-muted mb-3 text-xs">
        Solo una referencia general (tabla de Movement Solutions) — cada atleta puede salirse del rango.
      </p>

      <div className="flex flex-col gap-2">
        {resumen.map((r) => (
          <div key={r.cualidad} className="flex items-center justify-between gap-3 text-sm">
            <span className="dp-body">{r.cualidad}</span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-xs font-medium text-white ${
                r.estado === "dentro" ? "dp-bg-brand" : "dp-bg-amber"
              }`}
            >
              {r.setsTotales} sets/sem. (sugerido {r.fila.setsSemana[0]}-{r.fila.setsSemana[1]})
              {r.estado === "bajo" && " · bajo"}
              {r.estado === "sobre" && " · sobre"}
            </span>
          </div>
        ))}
      </div>

      {alertas.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-black/5 pt-3">
          {alertas.map((a) => (
            <p key={`${a.grupoMuscular}-${a.cualidad}`} className="dp-alert text-xs">
              ⚠ {a.grupoMuscular} aparece en {a.diasCount} días esta semana trabajando {a.cualidad.toLowerCase()} —
              es alta demanda de SNC, dejá 48-72h de por medio (una sesión de fuerza general/hipertrofia sobre el
              mismo grupo se recupera en 24-48h o menos).
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
