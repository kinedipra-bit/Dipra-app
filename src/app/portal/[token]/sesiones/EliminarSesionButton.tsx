"use client";

import { useTransition } from "react";
import { eliminarSesionPortal } from "./actions";

export function EliminarSesionButton({ token, sesionId }: { token: string; sesionId: string }) {
  const [pending, startTransition] = useTransition();

  const eliminar = () => {
    if (!confirm("¿Eliminar esta sesión? Por ejemplo si elegiste el día equivocado. No se puede deshacer.")) return;
    startTransition(() => {
      eliminarSesionPortal(token, sesionId);
    });
  };

  return (
    <button
      type="button"
      onClick={eliminar}
      disabled={pending}
      className="dp-muted text-xs hover:dp-alert disabled:opacity-50"
    >
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
