import type { TareaCheckin } from "@/lib/dipra/types";

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime()) ? f : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

// Cuántas veces el cliente marcó "lo hice" para este día de Tareas en los
// últimos 30 días (ver client_tareas_checkins) — separado de si entrenó su
// rutina de fuerza, porque las tareas de kine se cumplen o no por su cuenta.
export function TareasCheckinsDia({ checkins, diaId }: { checkins: TareaCheckin[]; diaId: string }) {
  const delDia = checkins.filter((c) => c.dia_id === diaId);
  if (delDia.length === 0) {
    return (
      <div className="dp-bg-faint mb-4 rounded-xl p-3">
        <p className="dp-muted text-[10px] font-semibold tracking-wide uppercase">Cumplimiento</p>
        <p className="dp-muted text-xs">Todavía no marcó este día como hecho (últimos 30 días).</p>
      </div>
    );
  }

  return (
    <div className="dp-bg-faint mb-4 rounded-xl p-3">
      <p className="dp-muted mb-1 text-[10px] font-semibold tracking-wide uppercase">
        Cumplimiento — {delDia.length} {delDia.length === 1 ? "vez" : "veces"} en los últimos 30 días
      </p>
      <div className="flex flex-wrap gap-1">
        {delDia.map((c) => (
          <span key={c.id} className="dp-bg-brand-soft dp-text-brand rounded-full px-2 py-0.5 font-mono text-[10px]">
            ✓ {fmtFecha(c.fecha)}
          </span>
        ))}
      </div>
    </div>
  );
}
