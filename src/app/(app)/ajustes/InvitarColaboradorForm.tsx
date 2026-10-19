"use client";

import { useState, useTransition } from "react";
import { invitarProfesional } from "./actions";

export function InvitarColaboradorForm() {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const invitar = () => {
    setMensaje(null);
    const correo = email.trim();
    if (!correo) {
      setMensaje({ tipo: "error", texto: "Ingresá un email." });
      return;
    }
    startTransition(async () => {
      const resultado = await invitarProfesional(correo);
      if (resultado.error) {
        setMensaje({ tipo: "error", texto: resultado.error });
        return;
      }
      setMensaje({ tipo: "ok", texto: `Invitación enviada a ${correo}.` });
      setEmail("");
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <h2 className="mb-1 font-medium dp-text-heading">Invitar colaborador/a</h2>
      <p className="dp-muted mb-3 text-xs">
        Le llega un mail con un link de un solo uso para que cree su propia contraseña y entre a la app —
        no hace falta que vos crees nada en Supabase. Va a tener el mismo acceso que vos: ve y edita todos
        los clientes, agenda y planes.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="dp-body font-medium">Email de la persona a invitar</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="estefania@ejemplo.com"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
        />
      </label>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={invitar}
          disabled={pending}
          className="dp-bg-brand rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Invitar"}
        </button>
        {mensaje && (
          <span className={mensaje.tipo === "ok" ? "dp-text-brand text-xs" : "dp-alert text-xs"}>
            {mensaje.texto}
          </span>
        )}
      </div>
    </section>
  );
}
