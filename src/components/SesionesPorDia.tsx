import { PILARES_KEYS } from "@/lib/dipra/constants";
import { tonoEscalaPilar } from "@/lib/dipra/calc";
import type { Sesion } from "@/lib/dipra/types";

function pilarInvertido(p: (typeof PILARES_KEYS)[number]): boolean {
  return "invertido" in p && p.invertido === true;
}

/**
 * Resumen compacto de las sesiones registradas para un día puntual del plan
 * (match por `dia_plan_label` === label del día), para mostrar "anexado" al
 * día correspondiente — tanto en el plan que ve el profesional como en el
 * que ve el atleta desde su portal. Muestra las últimas 3, más recientes
 * primero.
 *
 * `semanaCreatedAt`, si se pasa, acota a sesiones desde que esa semana se
 * creó — mismo criterio que alertasProgramacion.ts ("sin esto, una sesión
 * de una semana anterior que reutilizó la misma etiqueta 'Día 1'/'Día 3'
 * podía aparecer pegada al día equivocado").
 */
export function SesionesPorDia({
  sesiones,
  diaLabel,
  semanaCreatedAt,
}: {
  sesiones: Sesion[];
  diaLabel: string;
  semanaCreatedAt?: string | null;
}) {
  const desde = semanaCreatedAt?.slice(0, 10);
  const delDia = sesiones
    .filter((s) => s.dia_plan_label === diaLabel && (!desde || s.fecha >= desde))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 3);

  if (delDia.length === 0) return null;

  return (
    <div className="dp-bg-faint mb-4 flex flex-col gap-2 rounded-xl p-3">
      <p className="dp-muted text-[10px] font-semibold tracking-wide uppercase">
        Sesiones registradas en este día
      </p>
      {delDia.map((s) => (
        <div key={s.id} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="dp-muted font-mono text-[11px]">{s.fecha}</span>
            <div className="flex gap-1">
              {PILARES_KEYS.map((p) => {
                const raw = s.pilares[p.key as keyof typeof s.pilares];
                if (raw === "" || raw === undefined) return null;
                const v = Number(raw);
                return (
                  <span
                    key={p.key}
                    title={`${p.label}: ${v}`}
                    className={`flex h-4 w-4 items-center justify-center rounded-sm font-mono text-[9px] font-semibold text-white ${tonoEscalaPilar(v, pilarInvertido(p))}`}
                  >
                    {v}
                  </span>
                );
              })}
            </div>
          </div>
          {s.comentarios && <p className="dp-body text-xs">{s.comentarios}</p>}
        </div>
      ))}
    </div>
  );
}
