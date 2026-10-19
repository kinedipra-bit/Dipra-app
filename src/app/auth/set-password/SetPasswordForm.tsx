"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordForm() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [verificando, setVerificando] = useState(true);
  const [sesionValida, setSesionValida] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // El link del mail de invitación trae la sesión en el fragmento de la
    // URL (#access_token=...) — el cliente de Supabase la detecta y la
    // guarda sola al cargar la página, no hay nada que pedirle a mano acá.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesionValida(!!session);
      setVerificando(false);
    });
  }, [supabase]);

  const enviar = () => {
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  if (verificando) {
    return (
      <div className="dp-surface rounded-2xl p-6 text-center shadow-sm">
        <p className="dp-muted text-sm">Verificando tu link…</p>
      </div>
    );
  }

  if (!sesionValida) {
    return (
      <div className="dp-surface flex flex-col gap-2 rounded-2xl p-6 text-center shadow-sm">
        <p className="dp-alert text-sm font-medium">El link no es válido o ya venció.</p>
        <p className="dp-muted text-xs">Pedile a tu profesional que te invite de nuevo desde Ajustes.</p>
      </div>
    );
  }

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
