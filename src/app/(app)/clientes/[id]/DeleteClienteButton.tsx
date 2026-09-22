"use client";

import { useTransition } from "react";
import { deleteCliente } from "../actions";

export function DeleteClienteButton({
  clienteId,
  clienteNombre,
}: {
  clienteId: string;
  clienteNombre: string;
}) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    if (!confirm(`¿Eliminar a ${clienteNombre}? Esta acción no se puede deshacer.`)) return;
    startTransition(() => {
      deleteCliente(clienteId);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="dp-alert rounded-lg border border-current px-3 py-1.5 text-sm font-medium disabled:opacity-50"
    >
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
