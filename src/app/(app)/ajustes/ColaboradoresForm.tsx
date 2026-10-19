"use client";

import { useState, useTransition } from "react";
import { cambiarContrasenaColaborador } from "./actions";

type Colaborador = { id: string; full_name: string; email: string };

export function ColaboradoresForm({ colaboradores }: { colaboradores: Colaborador[] }) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<{ id: string; tipo: "ok" | "error"; texto: string } | null>(null);

  const abrir = (id: string) => {
    setEditandoId(id);
    setNuevaPassword("");
    setMensaje(null);
  };

  const guardar = (id: string) => {
    if (nuevaPassword.length < 6) {
      setMensaje({ id, tipo: "error", texto: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }
    startTransition(async () => {
      const resultado = await cambiarContrasenaColaborador(id, nuevaPassword);
      if (resultado.error) {
        setMensaje({ id, tipo: "error", texto: resultado.error });
        return;
      }
      setMensaje({ id, tipo: "ok", texto: "Contraseña actualizada." });
      setEditandoId(null);
      setNuevaPassword("");
    });
  };

  if (colaboradores.length === 0) return null;

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <h2 className="mb-1 font-medium dp-text-heading">Colaboradores</h2>
      <p className="dp-muted mb-3 text-xs">
        Si alguien no puede entrar, acá le podés poner vos mismo una contraseña nueva y pasársela
        directo (por WhatsApp, por ejemplo) — no depende de que le llegue un mail.
      </p>
      <ul className="flex flex-col divide-y divide-black/5">
        {colaboradores.map((c) => (
          <li key={c.id} className="flex flex-col gap-2 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="dp-text-heading truncate text-sm font-medium">{c.full_name || c.email}</p>
                <p className="dp-muted truncate text-xs">{c.email}</p>
              </div>
              {editandoId !== c.id && (
                <button
                  type="button"
                  onClick={() => abrir(c.id)}
                  className="dp-text-brand shrink-0 text-xs font-medium hover:underline"
                >
                  Cambiar contraseña
                </button>
              )}
            </div>

            {editandoId === c.id && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="Contraseña nueva (mín. 6 caracteres)"
                  autoFocus
                  className="w-56 rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
                />
                <button
                  type="button"
                  onClick={() => guardar(c.id)}
                  disabled={pending}
                  className="dp-bg-brand rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {pending ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoId(null)}
                  className="dp-muted text-xs hover:underline"
                >
                  Cancelar
                </button>
              </div>
            )}

            {mensaje?.id === c.id && (
              <span className={mensaje.tipo === "ok" ? "dp-text-brand text-xs" : "dp-alert text-xs"}>
                {mensaje.texto}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
