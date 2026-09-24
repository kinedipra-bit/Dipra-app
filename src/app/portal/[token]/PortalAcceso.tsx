"use client";

import { useState, useTransition } from "react";
import { registrarPin, iniciarSesionPin, solicitarRestablecerPin, restablecerPin } from "./acciones-acceso";

type Modo = "login" | "registro" | "olvide" | "restablecer";

export function PortalAcceso({
  token,
  nombre,
  correoEnmascarado,
  pinConfigurado,
  rt,
}: {
  token: string;
  nombre: string;
  correoEnmascarado: string;
  pinConfigurado: boolean;
  rt?: string;
}) {
  const [modo, setModo] = useState<Modo>(rt ? "restablecer" : pinConfigurado ? "login" : "registro");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const primerNombre = nombre.trim().split(" ")[0] || nombre;
  const inputClass =
    "rounded-lg border border-black/10 px-3 py-2 text-center text-lg tracking-[0.5em] font-mono outline-none focus:dp-border-brand";
  const soloDigitos = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  const registrar = () => {
    setError(null);
    if (pin.length !== 4) return setError("El PIN debe tener 4 dígitos.");
    if (pin !== pin2) return setError("Los dos PIN no coinciden.");
    startTransition(async () => {
      const res = await registrarPin(token, pin);
      if (!res.ok) setError(res.error);
    });
  };

  const entrar = () => {
    setError(null);
    startTransition(async () => {
      const res = await iniciarSesionPin(token, pin);
      if (!res.ok) setError(res.error);
    });
  };

  const pedirReset = () => {
    setError(null);
    setMensaje(null);
    startTransition(async () => {
      const res = await solicitarRestablecerPin(token);
      if (!res.ok) setError(res.error);
      else setMensaje(`Te mandamos un enlace a ${correoEnmascarado} — revisá tu correo (y spam).`);
    });
  };

  const restablecer = () => {
    setError(null);
    if (pin.length !== 4) return setError("El PIN debe tener 4 dígitos.");
    if (pin !== pin2) return setError("Los dos PIN no coinciden.");
    startTransition(async () => {
      const res = await restablecerPin(token, rt!, pin);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="dp-surface flex w-full max-w-sm flex-col gap-4 rounded-2xl p-6 shadow-sm">
        {error && <p className="dp-bg-alert-soft dp-alert rounded-lg px-3 py-2 text-sm">{error}</p>}
        {mensaje && <p className="dp-bg-faint dp-body rounded-lg px-3 py-2 text-sm">{mensaje}</p>}

        {modo === "registro" && (
          <>
            <div>
              <h2 className="dp-text-heading font-medium">Hola, {primerNombre}</h2>
              <p className="dp-muted text-sm">
                Es tu primera vez acá — creá un PIN de 4 dígitos para proteger tu portal.
              </p>
            </div>
            <input
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(soloDigitos(e.target.value))}
              placeholder="PIN"
              className={inputClass}
              autoFocus
            />
            <input
              inputMode="numeric"
              value={pin2}
              onChange={(e) => setPin2(soloDigitos(e.target.value))}
              placeholder="Repetí el PIN"
              className={inputClass}
            />
            <button
              type="button"
              onClick={registrar}
              disabled={pending}
              className="dp-bg-brand rounded-lg py-2 font-medium text-white disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Crear PIN y entrar"}
            </button>
          </>
        )}

        {modo === "login" && (
          <>
            <div>
              <h2 className="dp-text-heading font-medium">Hola, {primerNombre}</h2>
              <p className="dp-muted text-sm">Ingresá tu PIN para ver tu portal.</p>
            </div>
            <input
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(soloDigitos(e.target.value))}
              placeholder="PIN"
              className={inputClass}
              autoFocus
            />
            <button
              type="button"
              onClick={entrar}
              disabled={pending || pin.length !== 4}
              className="dp-bg-brand rounded-lg py-2 font-medium text-white disabled:opacity-50"
            >
              {pending ? "Entrando…" : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("olvide");
                setError(null);
                setMensaje(null);
              }}
              className="dp-muted text-xs underline"
            >
              ¿Olvidaste tu PIN?
            </button>
          </>
        )}

        {modo === "olvide" && (
          <>
            <div>
              <h2 className="dp-text-heading font-medium">Restablecer PIN</h2>
              <p className="dp-muted text-sm">
                Te mandamos un enlace a {correoEnmascarado || "tu correo"} para elegir uno nuevo.
              </p>
            </div>
            <button
              type="button"
              onClick={pedirReset}
              disabled={pending || !correoEnmascarado}
              className="dp-bg-brand rounded-lg py-2 font-medium text-white disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar enlace"}
            </button>
            {!correoEnmascarado && (
              <p className="dp-muted text-xs">No hay correo registrado — pedile a tu profesional que lo cargue.</p>
            )}
            <button
              type="button"
              onClick={() => {
                setModo("login");
                setError(null);
                setMensaje(null);
              }}
              className="dp-muted text-xs underline"
            >
              Volver
            </button>
          </>
        )}

        {modo === "restablecer" && (
          <>
            <div>
              <h2 className="dp-text-heading font-medium">Elegí tu nuevo PIN</h2>
            </div>
            <input
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(soloDigitos(e.target.value))}
              placeholder="Nuevo PIN"
              className={inputClass}
              autoFocus
            />
            <input
              inputMode="numeric"
              value={pin2}
              onChange={(e) => setPin2(soloDigitos(e.target.value))}
              placeholder="Repetí el nuevo PIN"
              className={inputClass}
            />
            <button
              type="button"
              onClick={restablecer}
              disabled={pending}
              className="dp-bg-brand rounded-lg py-2 font-medium text-white disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar y entrar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
