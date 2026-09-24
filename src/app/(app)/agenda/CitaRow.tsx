"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { ESTADOS_CITA } from "@/lib/dipra/constants";
import type { Cita } from "@/lib/dipra/types";
import { actualizarEstadoCita, eliminarCita } from "./actions";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function labelEstado(estado: (typeof ESTADOS_CITA)[number]) {
  return estado === "alerta" ? "Alerta leve" : estado.charAt(0).toUpperCase() + estado.slice(1);
}

export function CitaRow({ cita }: { cita: Cita }) {
  const [estado, setEstado] = useState(cita.estado);
  const [pending, startTransition] = useTransition();

  const cambiarEstado = (nuevo: Cita["estado"]) => {
    setEstado(nuevo);
    startTransition(async () => {
      await actualizarEstadoCita(cita.id, nuevo);
    });
  };

  const borrar = () => {
    if (!confirm(`¿Eliminar la cita de ${cita.cliente_nombre}?`)) return;
    startTransition(async () => {
      await eliminarCita(cita.id);
    });
  };

  return (
    <div className="flex items-center gap-3 p-4">
      <span className="dp-body w-16 shrink-0 font-mono text-sm">{cita.hora.slice(0, 5)}</span>
      <Avatar iniciales={iniciales(cita.cliente_nombre)} size={34} />
      <div className="min-w-0 flex-1">
        {cita.client_id ? (
          <Link
            href={`/clientes/${cita.client_id}/ficha`}
            className="dp-text-heading truncate text-sm font-medium hover:dp-text-brand"
          >
            {cita.cliente_nombre}
          </Link>
        ) : (
          <p className="dp-text-heading truncate text-sm font-medium">{cita.cliente_nombre}</p>
        )}
        <p className="dp-muted text-xs">{cita.tipo}</p>
      </div>
      <select
        value={estado}
        onChange={(e) => cambiarEstado(e.target.value as Cita["estado"])}
        disabled={pending}
        className="rounded-lg border border-black/10 px-2 py-1 text-xs outline-none disabled:opacity-50"
      >
        {ESTADOS_CITA.map((e) => (
          <option key={e} value={e}>
            {labelEstado(e)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={borrar}
        disabled={pending}
        className="dp-muted shrink-0 text-sm hover:dp-alert disabled:opacity-50"
      >
        ✕
      </button>
    </div>
  );
}
