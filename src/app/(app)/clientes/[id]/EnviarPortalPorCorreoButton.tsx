"use client";

import { useState, useTransition } from "react";
import { enviarLinkPortal } from "../actions";

export function EnviarPortalPorCorreoButton({ clienteId }: { clienteId: string }) {
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const enviar = () => {
    setMensaje(null);
    startTransition(async () => {
      const resultado = await enviarLinkPortal(clienteId);
      setMensaje(
        resultado.ok ? { tipo: "ok", texto: "¡Enviado!" } : { tipo: "error", texto: resultado.error }
      );
    });
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={enviar}
        disabled={pending}
        className="dp-body rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Enviando…" : "✉ Enviar por correo"}
      </button>
      {mensaje && (
        <span className={`text-[11px] ${mensaje.tipo === "error" ? "dp-alert" : "dp-muted"}`}>{mensaje.texto}</span>
      )}
    </div>
  );
}
