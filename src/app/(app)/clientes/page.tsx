import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { alertasCliente, esClienteRemoto } from "@/lib/dipra/alertasProgramacion";
import type { Cliente, PlanSemana, Sesion } from "@/lib/dipra/types";
import { ClientesListView } from "./ClientesListView";

type ClienteFila = Pick<
  Cliente,
  "id" | "nombre" | "iniciales" | "categoria" | "objetivo" | "semana_activa_id" | "remoto"
>;

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clients")
    .select("id, nombre, iniciales, categoria, objetivo, semana_activa_id, remoto")
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
        <ClientesListView
          clientes={clientes.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            iniciales: c.iniciales,
            categoria: c.categoria,
            objetivo: c.objetivo,
            remoto: c.remoto,
            alertas: alertasPorCliente.get(c.id),
          }))}
        />
      )}
    </div>
  );
}
