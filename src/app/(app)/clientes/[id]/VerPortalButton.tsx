"use client";

import { useState, useTransition } from "react";
import { entrarComoProfesional } from "@/app/portal/[token]/acciones-acceso";

// Abre el portal del cliente en una pestaña nueva, ya logueado — sin pedir
// el PIN (que el profesional no tiene por qué saber). Útil para ver cómo
// le quedó el portal recién armada/ajustada su planificación.
export function VerPortalButton({ portalToken }: { portalToken: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const abrir = () => {
    setError(null);
    // Reserva la pestaña ANTES del await del server action — si se abre
    // después, algunos navegadores lo bloquean como popup no solicitado
    // (ya no cuenta como "directo" del click).
    const nuevaVentana = window.open("", "_blank");
    startTransition(async () => {
      const resultado = await entrarComoProfesional(portalToken);
      if (!resultado.ok) {
        setError(resultado.error);
        nuevaVentana?.close();
        return;
      }
      if (nuevaVentana) nuevaVentana.location.href = `/portal/${portalToken}/plan`;
    });
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={abrir}
        disabled={pending}
        className="dp-body rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Abriendo…" : "👁 Ver portal"}
      </button>
      {error && <span className="dp-alert text-[11px]">{error}</span>}
    </div>
  );
}
