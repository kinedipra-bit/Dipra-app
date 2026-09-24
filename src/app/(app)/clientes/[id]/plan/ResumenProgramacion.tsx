import { alertasDescanso, resumenSetsPorCualidad, type CitaParaDescanso } from "@/lib/dipra/tablaIntensidad";
import type { DiaPlan } from "@/lib/dipra/types";

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Resumen de programación semanal: sets totales por cualidad de fuerza
 * (sumados en todos los días de la semana activa) vs. el rango sugerido
 * por la tabla de intensidad, más un recordatorio de descanso cuando un
 * mismo grupo muscular aparece más de una vez a alta intensidad (Fuerza
 * Máxima / Potencia Máxima) en la semana — cruzado con la agenda real
 * (citas con día del plan asignado) cuando hay suficientes citas agendadas.
 * Son sugerencias generales, no una validación — dependen de cada atleta.
 */
export function ResumenProgramacion({ dias, citas }: { dias: DiaPlan[]; citas: CitaParaDescanso[] }) {
  const resumen = resumenSetsPorCualidad(dias);
  const alertas = alertasDescanso(dias, citas);

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
          {alertas.map((a) =>
            a.horasReales !== undefined ? (
              <p key={`${a.grupoMuscular}-${a.cualidad}`} className="dp-alert text-xs">
                ⚠ {a.grupoMuscular} + {a.cualidad.toLowerCase()}: según la agenda real quedan solo {a.horasReales}h
                de descanso entre el {formatFechaHora(a.fechaDesde!)} y el {formatFechaHora(a.fechaHasta!)} — es alta
                demanda de SNC, recomendado 48-72h de por medio.
              </p>
            ) : (
              <p key={`${a.grupoMuscular}-${a.cualidad}`} className="dp-alert text-xs">
                ⚠ {a.grupoMuscular} aparece en {a.diasCount} días esta semana trabajando {a.cualidad.toLowerCase()} —
                es alta demanda de SNC, dejá 48-72h de por medio (una sesión de fuerza general/hipertrofia sobre el
                mismo grupo se recupera en 24-48h o menos). Agendá estos días para ver el descanso real.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
