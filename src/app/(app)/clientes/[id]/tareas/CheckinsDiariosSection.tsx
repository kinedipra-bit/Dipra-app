import type { CheckinDiario } from "@/lib/dipra/types";

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime()) ? f : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

// Tono según dolor (más dolor = más alerta) — igual criterio de 3 niveles
// que tonoEscala en calc.ts, pero acá el 0 es bueno (no hay escala
// invertida reusable porque el rango es 0-5, no 1-10).
function tonoDolor(n: number) {
  if (n >= 4) return "dp-bg-alert";
  if (n >= 2) return "dp-bg-amber";
  return "dp-bg-brand";
}

// Resumen de "¿Cómo te sentís hoy?" (ver CheckinDiarioCard en el portal) —
// últimos 14 días, para ver de un vistazo si el dolor viene bajando o
// subiendo antes de entrar al detalle de cada sesión.
export function CheckinsDiariosSection({ checkins }: { checkins: CheckinDiario[] }) {
  if (checkins.length === 0) return null;
  const ultimos = checkins.slice(0, 14);

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <h2 className="mb-1 font-medium dp-text-heading">Cómo se fue sintiendo (últimos 14 días)</h2>
      <p className="dp-muted mb-3 text-xs">Lo que el cliente registra solo, independiente de si marcó tareas hechas.</p>
      <div className="flex flex-wrap gap-2">
        {ultimos.map((c) => (
          <div key={c.id} className="dp-bg-faint flex flex-col items-center gap-1 rounded-xl px-2.5 py-2" title={c.nota || undefined}>
            <span className="dp-muted text-[9px] font-medium">{fmtFecha(c.fecha)}</span>
            <span className={`${tonoDolor(c.dolor)} rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold text-white`}>
              Dolor {c.dolor}
            </span>
            <span className="dp-muted font-mono text-[10px]">Energía {c.energia}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
