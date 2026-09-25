import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { alertasCliente, esClienteRemoto } from "@/lib/dipra/alertasProgramacion";
import type { Cliente, PlanSemana, Sesion } from "@/lib/dipra/types";

type ClienteFila = Pick<Cliente, "id" | "nombre" | "iniciales" | "categoria" | "objetivo" | "semana_activa_id">;

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clients")
    .select("id, nombre, iniciales, categoria, objetivo, semana_activa_id")
    .order("nombre")
    .returns<ClienteFila[]>();

  const clienteIds = (clientes ?? []).map((c) => c.id);
  const semanaIds = (clientes ?? []).map((c) => c.semana_activa_id).filter((id): id is string => !!id);

  const [{ data: semanas }, { data: sesiones }] = await Promise.all([
    semanaIds.length > 0
      ? supabase.from("plan_semanas").select("id, dias, created_at").in("id", semanaIds).returns<
          Pick<PlanSemana, "id" | "dias" | "created_at">[]
        >()
      : Promise.resolve({ data: [] as Pick<PlanSemana, "id" | "dias" | "created_at">[] }),
    clienteIds.length > 0
      ? supabase
          .from("sesiones")
          .select("client_id, fecha, dia_plan_label, registrada_por_cliente, revisada")
          .in("client_id", clienteIds)
          .returns<Pick<Sesion, "client_id" | "fecha" | "dia_plan_label" | "registrada_por_cliente" | "revisada">[]>()
      : Promise.resolve({ data: [] as Pick<Sesion, "client_id" | "fecha" | "dia_plan_label" | "registrada_por_cliente" | "revisada">[] }),
  ]);

  const semanaPorId = new Map((semanas ?? []).map((s) => [s.id, s]));
  const alertasPorCliente = new Map<string, ReturnType<typeof alertasCliente>>();
  (clientes ?? []).forEach((c) => {
    const sesionesCliente = (sesiones ?? []).filter((s) => s.client_id === c.id);
    if (!esClienteRemoto(sesionesCliente)) return;
    const semana = c.semana_activa_id ? semanaPorId.get(c.semana_activa_id) : undefined;
    const alertas = alertasCliente({
      dias: semana?.dias ?? [],
      semanaCreatedAt: semana?.created_at,
      sesiones: sesionesCliente,
    });
    if (alertas.length > 0) alertasPorCliente.set(c.id, alertas);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold dp-text-heading">
          Clientes
        </h1>
        <Link href="/clientes/nuevo" className="dp-bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white">
          + Nuevo cliente
        </Link>
      </div>

      {!clientes || clientes.length === 0 ? (
        <p className="dp-muted text-sm">Todavía no hay clientes cargados.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {clientes.map((c) => {
            const alertas = alertasPorCliente.get(c.id);
            return (
              <Link
                key={c.id}
                href={`/clientes/${c.id}/ficha`}
                className="dp-surface flex items-start gap-3 rounded-2xl p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <Avatar iniciales={c.iniciales} />
                <div className="min-w-0 flex-1">
                  <p className="dp-text-heading truncate font-medium">{c.nombre}</p>
                  <p className="dp-muted text-xs">{c.categoria || "Sin categoría"}</p>
                  {c.objetivo && <p className="dp-body mt-1 line-clamp-2 text-xs">{c.objetivo}</p>}
                  {alertas && (
                    <div className="mt-2 flex flex-col gap-1">
                      {alertas.map((a) => (
                        <span
                          key={a.tipo}
                          className="dp-bg-alert-soft dp-alert w-fit rounded-full px-2 py-0.5 text-[10px] font-medium"
                        >
                          ⚠ {a.detalle}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
