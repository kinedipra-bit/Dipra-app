import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { deficitExplosivo, imc, isPR, maxDe } from "@/lib/dipra/calc";
import { enmascararCorreo } from "@/lib/dipra/portalPin";
import { GRUPOS, type MetricKey } from "@/app/(app)/clientes/[id]/evolucion/metricas";
import type { ComposicionCorporalEntry, PrHistorialEntry } from "@/lib/dipra/types";
import { obtenerClientePortal, sesionValidaPara } from "../acceso";
import { PortalAcceso } from "../PortalAcceso";

type NumericHist = Pick<PrHistorialEntry, MetricKey>;

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime())
    ? f
    : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
}

export default async function PortalEvolucionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cliente = await obtenerClientePortal(token);
  if (!cliente) notFound();

  if (!(await sesionValidaPara(cliente.id))) {
    return (
      <PortalAcceso
        token={token}
        nombre={cliente.nombre}
        correoEnmascarado={cliente.correo ? enmascararCorreo(cliente.correo) : ""}
        pinConfigurado={!!cliente.pinHash}
      />
    );
  }

  const admin = createAdminClient();

  const [{ data: historialDesc }, { data: composicionDesc }] = await Promise.all([
    admin
      .from("client_pr_historial")
      .select("*")
      .eq("client_id", cliente.id)
      .order("fecha", { ascending: false })
      .returns<PrHistorialEntry[]>(),
    admin
      .from("client_composicion_corporal")
      .select("*")
      .eq("client_id", cliente.id)
      .order("fecha", { ascending: false })
      .returns<ComposicionCorporalEntry[]>(),
  ]);

  const composicion = composicionDesc ?? [];
  const hist = historialDesc ? [...historialDesc].sort((a, b) => a.fecha.localeCompare(b.fecha)) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="dp-scope-dark rounded-2xl p-5 shadow-sm">
        <h2 className="dp-text-brand mb-1 font-[family-name:var(--font-display)] font-semibold">
          Composición corporal
        </h2>
        <p className="dp-muted mb-3 text-xs">Lo que tu profesional va registrando en cada medición.</p>
        {composicion.length === 0 ? (
          <p className="dp-muted text-sm">Todavía no hay mediciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="dp-muted text-left text-[10px] font-medium tracking-wide uppercase">
                  <th className="pb-1 pr-3">Fecha</th>
                  <th className="pb-1 pr-3">Peso</th>
                  <th className="pb-1 pr-3">IMC</th>
                  <th className="pb-1 pr-3">% Grasa</th>
                  <th className="pb-1 pr-3">M. muscular</th>
                  <th className="pb-1 pr-3">% Agua</th>
                  <th className="pb-1">M. ósea</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {composicion.map((c) => (
                  <tr key={c.id} className="dp-body font-mono text-xs">
                    <td className="py-1.5 pr-3">{fmtFecha(c.fecha)}</td>
                    <td className="py-1.5 pr-3">{c.peso ?? "—"} kg</td>
                    <td className="py-1.5 pr-3">{c.talla && c.peso ? imc(c.talla, c.peso) : "—"}</td>
                    <td className="py-1.5 pr-3">{c.grasa_pct !== null ? `${c.grasa_pct}%` : "—"}</td>
                    <td className="py-1.5 pr-3">{c.masa_muscular ?? "—"}</td>
                    <td className="py-1.5 pr-3">{c.agua_pct !== null ? `${c.agua_pct}%` : "—"}</td>
                    <td className="py-1.5">{c.masa_osea ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hist.length === 0 ? (
        <p className="dp-muted dp-surface rounded-2xl p-8 text-center text-sm shadow-sm">
          Todavía no hay marcas registradas — tu profesional las va cargando en cada evaluación de rendimiento.
        </p>
      ) : (
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
      )}
    </div>
  );
}
