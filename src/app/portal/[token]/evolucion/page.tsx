import { createAdminClient } from "@/lib/supabase/admin";
import { deficitExplosivo, isPR } from "@/lib/dipra/calc";
import type { PrHistorialEntry } from "@/lib/dipra/types";

type NumericKey =
  | "sentadilla"
  | "peso_muerto"
  | "press_banca"
  | "press_militar"
  | "cmj"
  | "squat_jump"
  | "pull_ups"
  | "push_up";

const COLUMNAS: { key: NumericKey; label: string }[] = [
  { key: "sentadilla", label: "Sentadilla" },
  { key: "peso_muerto", label: "Peso muerto" },
  { key: "press_banca", label: "Press banca" },
  { key: "press_militar", label: "Press militar" },
  { key: "cmj", label: "CMJ" },
  { key: "squat_jump", label: "Squat jump" },
  { key: "pull_ups", label: "Pull ups" },
  { key: "push_up", label: "Push up" },
];

export default async function PortalEvolucionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: cliente } = await admin.from("clients").select("id").eq("portal_token", token).single();
  if (!cliente) return <p className="dp-muted text-sm">Link inválido.</p>;

  const { data: historial } = await admin
    .from("client_pr_historial")
    .select("*")
    .eq("client_id", cliente.id)
    .order("fecha", { ascending: false })
    .returns<PrHistorialEntry[]>();

  if (!historial || historial.length === 0) {
    return <p className="dp-muted text-sm">Todavía no hay marcas registradas.</p>;
  }

  return (
    <div className="dp-surface overflow-x-auto rounded-2xl p-5 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="dp-muted text-left text-xs">
            <th className="pb-2 pr-3 font-medium">Mesociclo</th>
            {COLUMNAS.map((c) => (
              <th key={c.key} className="pb-2 pr-3 text-right font-mono font-medium">
                {c.label}
              </th>
            ))}
            <th className="pb-2 text-right font-medium">Déficit explosivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {historial.map((h) => {
            const deficit = deficitExplosivo(h.cmj, h.squat_jump);
            return (
              <tr key={h.id}>
                <td className="dp-body py-2 pr-3">
                  <p className="dp-text-heading font-medium">{h.mesociclo || "—"}</p>
                  <p className="dp-muted font-mono text-xs">{h.fecha}</p>
                </td>
                {COLUMNAS.map((c) => {
                  const valor = Number(h[c.key]) || 0;
                  const pr = isPR<Pick<PrHistorialEntry, NumericKey>>(historial, c.key, valor);
                  return (
                    <td key={c.key} className="dp-body py-2 pr-3 text-right font-mono">
                      {valor || "—"} {pr && valor > 0 && <span className="dp-text-amber">★</span>}
                    </td>
                  );
                })}
                <td className="py-2 text-right font-mono">
                  {deficit === null ? (
                    "—"
                  ) : (
                    <span className={deficit < 15 ? "dp-alert" : "dp-body"}>{deficit.toFixed(0)}%</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
