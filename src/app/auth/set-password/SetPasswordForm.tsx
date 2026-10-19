"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { definirContrasena } from "./actions";

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const enviar = () => {
    setError(null);
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (password !== confirmar) return setError("Las contraseñas no coinciden.");

    startTransition(async () => {
      try {
        await definirContrasena(password);
        router.push("/");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar la contraseña.");
      }
    });
  };

  return (
    <div className="dp-surface flex flex-col gap-4 rounded-2xl p-6 shadow-sm">
      {error && <p className="dp-bg-alert-soft dp-alert rounded-lg px-3 py-2 text-sm">{error}</p>}

      <label className="flex flex-col gap-1 text-sm">
        <span className="dp-body font-medium">Nueva contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:dp-border-brand"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="dp-body font-medium">Repetí la contraseña</span>
        <input
          type="password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          autoComplete="new-password"
          className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:dp-border-brand"
        />
      </label>

      <button
        type="button"
        onClick={enviar}
        disabled={pending}
        className="dp-bg-brand mt-2 rounded-lg py-2 font-medium text-white transition-colors disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Entrar"}
      </button>
    </div>
  );
}
