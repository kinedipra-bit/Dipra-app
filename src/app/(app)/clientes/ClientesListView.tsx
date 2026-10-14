"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { alertasCliente } from "@/lib/dipra/alertasProgramacion";

type ClienteFila = {
  id: string;
  nombre: string;
  iniciales: string;
  categoria: string;
  objetivo: string;
  remoto: boolean;
  alertas?: ReturnType<typeof alertasCliente>;
};

// Lista (no grilla de tarjetas) + buscador — con 100 clientes cargados no
// tiene sentido desplazarse tarjeta por tarjeta para encontrar uno.
export function ClientesListView({ clientes }: { clientes: ClienteFila[] }) {
  const [busqueda, setBusqueda] = useState("");

  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? clientes.filter(
        (c) => c.nombre.toLowerCase().includes(q) || c.categoria.toLowerCase().includes(q)
      )
    : clientes;

  return (
    <div className="flex flex-col gap-3">
      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar cliente por nombre o categoría…"
        autoFocus
        className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
      />

      {filtrados.length === 0 ? (
        <p className="dp-muted py-6 text-center text-sm">Ningún cliente coincide con &quot;{busqueda}&quot;.</p>
      ) : (
        <div className="dp-surface divide-y divide-black/5 rounded-2xl shadow-sm">
          {filtrados.map((c) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}/ficha`}
              className="flex items-center gap-3 p-3 transition-colors hover:dp-bg-faint"
            >
              <Avatar iniciales={c.iniciales} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="dp-text-heading truncate text-sm font-medium">{c.nombre}</p>
                  {c.remoto && (
                    <span className="dp-bg-blue-soft dp-text-blue shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
                      💻 100% remoto
                    </span>
                  )}
                </div>
                <p className="dp-muted truncate text-xs">
                  {c.categoria || "Sin categoría"}
                  {c.objetivo && ` · ${c.objetivo}`}
                </p>
              </div>
              {c.alertas && c.alertas.length > 0 && (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {c.alertas.map((a) => (
                    <span
                      key={a.tipo}
                      className="dp-bg-alert-soft dp-alert rounded-full px-2 py-0.5 text-[10px] font-medium"
                    >
                      ⚠ {a.detalle}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <p className="dp-muted text-xs">
        {filtrados.length} de {clientes.length} cliente{clientes.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
