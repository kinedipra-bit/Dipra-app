import { createAdminClient } from "@/lib/supabase/admin";
import { deficitExplosivo, isPR, maxDe } from "@/lib/dipra/calc";
import { GRUPOS, type MetricKey } from "@/app/(app)/clientes/[id]/evolucion/metricas";
import type { PrHistorialEntry } from "@/lib/dipra/types";

type NumericHist = Pick<PrHistorialEntry, MetricKey>;

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime())
    ? f
    : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
}

export default async function PortalEvolucionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: cliente } = await admin.from("clients").select("id").eq("portal_token", token).single();
  if (!cliente) return <p className="dp-muted text-sm">Link inválido.</p>;

  const { data: historialDesc } = await admin
    .from("client_pr_historial")
    .select("*")
    .eq("client_id", cliente.id)
    .order("fecha", { ascending: false })
    .returns<PrHistorialEntry[]>();

  if (!historialDesc || historialDesc.length === 0) {
    return (
      <p className="dp-muted dp-surface rounded-2xl p-8 text-center text-sm shadow-sm">
        Todavía no hay marcas registradas — tu profesional las va cargando en cada evaluación de rendimiento.
      </p>
    );
  }

  const hist = [...historialDesc].sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <div className="dp-scope-dark rounded-2xl p-5 shadow-sm">
      <h2 className="dp-text-brand mb-1 font-[family-name:var(--font-display)] font-semibold">Tu progreso</h2>
      <p className="dp-muted mb-4 text-xs">Cada columna es un mesociclo — el ★ marca tu mejor marca histórica.</p>

      <div className="mb-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${hist.length}, minmax(0,1fr))` }}>
        {hist.map((h) => (
          <div key={h.id} className="text-center">
            <p className="dp-muted font-mono text-[10px]">{fmtFecha(h.fecha)}</p>
            <p className="dp-text-heading truncate text-[11px] font-semibold">{h.mesociclo}</p>
            {h.objetivo && <p className="dp-text-brand truncate text-[10px]">{h.objetivo}</p>}
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
                ⚠ Déficit explosivo bajo 15% — el CMJ casi no mejora al SJ, foco en trabajo pliométrico/reactivo.
              </p>
            )}
          <div className="flex flex-col gap-4">
            {g.metrics.map((m) => {
              const max = maxDe<NumericHist>(hist, m.key);
              return (
                <div key={m.key}>
                  <p className="dp-muted mb-1 text-xs font-medium">{m.label}</p>
                  <div className="flex h-16 items-end gap-2">
                    {hist.map((h) => {
                      const v = h[m.key] || 0;
                      const pr = isPR<NumericHist>(hist, m.key, v);
                      return (
                        <div key={h.id} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                          {pr && <span className="dp-text-amber text-[11px]">★</span>}
                          <div
                            className="dp-bg-brand w-full rounded-t-md"
                            style={{ height: `${(v / max) * 100}%`, opacity: pr ? 1 : 0.55 }}
                            title={`${h.mesociclo} · ${fmtFecha(h.fecha)}: ${v}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1 flex gap-2">
                    {hist.map((h) => (
                      <span key={h.id} className="dp-muted flex-1 text-center font-mono text-[10px]">
                        {h[m.key] || "—"}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
