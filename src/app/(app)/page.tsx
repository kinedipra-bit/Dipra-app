import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function InicioPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ count: totalClientes }, { data: citasHoy }, { count: sesionesHoy }] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase
      .from("citas")
      .select("id, hora, tipo, estado, cliente_nombre, client_id")
      .eq("fecha", today)
      .order("hora"),
    supabase.from("sesiones").select("id", { count: "exact", head: true }).eq("fecha", today),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold dp-text-heading">
          Inicio
        </h1>
        <p className="dp-body mt-1">Resumen del día</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <p className="dp-muted text-sm">Clientes</p>
          <p className="mt-1 text-3xl font-semibold dp-text-heading">{totalClientes ?? 0}</p>
        </div>
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <p className="dp-muted text-sm">Citas hoy</p>
          <p className="mt-1 text-3xl font-semibold dp-text-heading">{citasHoy?.length ?? 0}</p>
        </div>
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <p className="dp-muted text-sm">Sesiones hoy</p>
          <p className="mt-1 text-3xl font-semibold dp-text-heading">{sesionesHoy ?? 0}</p>
        </div>
      </div>

      <div className="dp-surface rounded-2xl p-5 shadow-sm">
        <h2 className="mb-3 font-medium dp-text-heading">Citas de hoy</h2>
        {!citasHoy || citasHoy.length === 0 ? (
          <p className="dp-muted text-sm">No hay citas agendadas para hoy.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5">
            {citasHoy.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="dp-body">
                  <span className="dp-text-heading font-mono font-medium">{c.hora}</span> —{" "}
                  {c.client_id ? (
                    <Link href={`/clientes/${c.client_id}/ficha`} className="dp-text-brand hover:underline">
                      {c.cliente_nombre}
                    </Link>
                  ) : (
                    c.cliente_nombre
                  )}{" "}
                  <span className="dp-text-faint">({c.tipo})</span>
                </span>
                <span className="dp-muted text-xs capitalize">{c.estado}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
