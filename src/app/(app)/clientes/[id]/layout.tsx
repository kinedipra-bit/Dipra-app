import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import type { Cliente } from "@/lib/dipra/types";
import { DeleteClienteButton } from "./DeleteClienteButton";
import { ClienteTabs } from "./ClienteTabs";

export default async function ClienteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cliente } = await supabase.from("clients").select("*").eq("id", id).single<Cliente>();

  if (!cliente) notFound();

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
              {cliente.nombre}
            </h1>
            <p className="dp-muted text-sm">{cliente.categoria || "Sin categoría"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/agenda/nueva?clienteId=${cliente.id}&clienteNombre=${encodeURIComponent(cliente.nombre)}`}
            className="dp-bg-brand rounded-lg px-3 py-1.5 text-sm font-medium text-white"
          >
            Agendar
          </Link>
          <DeleteClienteButton clienteId={cliente.id} clienteNombre={cliente.nombre} />
        </div>
      </div>

      <ClienteTabs clienteId={cliente.id} />

      <div>{children}</div>
    </div>
  );
}
