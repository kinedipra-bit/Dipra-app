import { createAdminClient } from "@/lib/supabase/admin";
import { PILARES_KEYS } from "@/lib/dipra/constants";
import { EscalaUnoADiez } from "@/app/(app)/clientes/[id]/sesiones/EscalaUnoADiez";
import type { Sesion } from "@/lib/dipra/types";

export default async function PortalSesionesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: cliente } = await admin.from("clients").select("id").eq("portal_token", token).single();
  if (!cliente) return <p className="dp-muted text-sm">Link inválido.</p>;

  const { data: sesiones } = await admin
    .from("sesiones")
    .select("*")
    .eq("client_id", cliente.id)
    .order("fecha", { ascending: false })
    .returns<Sesion[]>();

  if (!sesiones || sesiones.length === 0) {
    return <p className="dp-muted text-sm">Todavía no hay sesiones registradas.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {sesiones.map((s) => (
        <div key={s.id} className="dp-surface rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="dp-text-heading font-medium">{s.tipo}</p>
            <p className="dp-muted font-mono text-xs">{s.fecha}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-4">
            {PILARES_KEYS.map((p) => (
              <div key={p.key} className="flex flex-col gap-1">
                <span className="dp-muted text-[10px] font-medium">{p.label}</span>
                <EscalaUnoADiez
                  value={s.pilares[p.key as keyof typeof s.pilares] ?? ""}
                  invertido={"invertido" in p ? p.invertido : false}
                  readOnly
                />
              </div>
            ))}
          </div>

          {s.comentarios && <p className="dp-body mt-3 text-sm">{s.comentarios}</p>}
        </div>
      ))}
    </div>
  );
}
