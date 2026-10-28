import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { calcularEdad, diasHastaCumpleanos } from "@/lib/dipra/cumpleanos";
import { obtenerRolActual } from "@/lib/dipra/auth";
import type { Cliente } from "@/lib/dipra/types";
import { DeleteClienteButton } from "./DeleteClienteButton";
import { ClienteTabs } from "./ClienteTabs";
import { CopyPortalLink } from "./CopyPortalLink";
import { VerPortalButton } from "./VerPortalButton";
import { EnviarPortalPorCorreoButton } from "./EnviarPortalPorCorreoButton";

export default async function ClienteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: cliente }, rol] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single<Cliente>(),
    obtenerRolActual(),
  ]);

  if (!cliente) notFound();

  // Para el aviso "cambios sin compartir" en las pestañas Plan/Tareas —
  // antes solo se veía adentro de cada pestaña, así que al estar parado en
  // Sesiones (u otra) no había ninguna señal de que algo quedó sin
  // compartir. Si el cliente no usa el portal, no tiene sentido avisar.
  const [{ data: planKine }, { data: semanaActiva }] = await Promise.all([
    cliente.portal_habilitado
      ? supabase
          .from("plan_kine")
          .select("cambios_sin_compartir")
          .eq("client_id", id)
          .maybeSingle<{ cambios_sin_compartir: boolean }>()
      : Promise.resolve({ data: null }),
    cliente.portal_habilitado && cliente.semana_activa_id
      ? supabase
          .from("plan_semanas")
          .select("cambios_sin_compartir")
          .eq("id", cliente.semana_activa_id)
          .maybeSingle<{ cambios_sin_compartir: boolean }>()
      : Promise.resolve({ data: null }),
  ]);

  const edad = calcularEdad(cliente.fecha_nacimiento);
  const esCumpleanosHoy =
    !!cliente.fecha_nacimiento && diasHastaCumpleanos(cliente.fecha_nacimiento) === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clientes" className="dp-muted text-sm hover:dp-text-brand">
            ← Clientes
          </Link>
        </div>
      </div>

      <div className="dp-surface flex items-center justify-between rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar iniciales={cliente.iniciales} size={48} />
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold dp-text-heading">
              {cliente.nombre} {esCumpleanosHoy && <span title="¡Cumpleaños hoy!">🎂</span>}
            </h1>
            <p className="dp-muted text-sm">
              {cliente.categoria || "Sin categoría"}
              {edad !== null && ` · ${edad} años`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyPortalLink portalToken={cliente.portal_token} />
          <EnviarPortalPorCorreoButton clienteId={cliente.id} />
          <VerPortalButton portalToken={cliente.portal_token} />
          <Link
            href={`/agenda/nueva?clienteId=${cliente.id}&clienteNombre=${encodeURIComponent(cliente.nombre)}`}
            className="dp-bg-brand rounded-lg px-3 py-1.5 text-sm font-medium text-white"
          >
            Agendar
          </Link>
          <DeleteClienteButton clienteId={cliente.id} clienteNombre={cliente.nombre} />
        </div>
      </div>

      <ClienteTabs
        clienteId={cliente.id}
        esAdmin={rol === "admin"}
        planSinCompartir={!!semanaActiva?.cambios_sin_compartir}
        tareasSinCompartir={!!planKine?.cambios_sin_compartir}
      />

      <div>{children}</div>
    </div>
  );
}
