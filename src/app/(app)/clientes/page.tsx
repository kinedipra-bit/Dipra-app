import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import type { Cliente } from "@/lib/dipra/types";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clients")
    .select("id, nombre, iniciales, categoria, objetivo")
    .order("nombre")
    .returns<Pick<Cliente, "id" | "nombre" | "iniciales" | "categoria" | "objetivo">[]>();

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
          {clientes.map((c) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}/ficha`}
              className="dp-surface flex items-start gap-3 rounded-2xl p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <Avatar iniciales={c.iniciales} />
              <div className="min-w-0">
                <p className="dp-text-heading truncate font-medium">{c.nombre}</p>
                <p className="dp-muted text-xs">{c.categoria || "Sin categoría"}</p>
                {c.objetivo && <p className="dp-body mt-1 line-clamp-2 text-xs">{c.objetivo}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
