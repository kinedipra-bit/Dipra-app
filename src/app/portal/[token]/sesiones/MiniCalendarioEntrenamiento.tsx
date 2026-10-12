"use client";

import { useState, useTransition } from "react";
import { confirmarDiaEntrenamiento, quitarDiaEntrenamiento } from "./actions";
import { ActivarNotificaciones } from "../notificaciones/ActivarNotificaciones";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function proximosDias(cantidad: number): { fecha: string; diaSemana: string; diaMes: number; esHoy: boolean }[] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() + i);
    return {
      fecha: toISODate(d),
      diaSemana: d.toLocaleDateString("es-CL", { weekday: "short" }).replace(/\.$/, ""),
      diaMes: d.getDate(),
      esHoy: i === 0,
    };
  });
}

/**
 * Mini calendario donde el cliente marca qué días de las próximas dos
 * semanas piensa entrenar — son fechas sueltas que él mismo confirma, no un
 * horario fijo. De acá sale el recordatorio push del día (si lo activó).
 */
export function MiniCalendarioEntrenamiento({
  token,
  diasConfirmadosIniciales,
}: {
  token: string;
  diasConfirmadosIniciales: string[];
}) {
  const dias = proximosDias(14);
  const [confirmados, setConfirmados] = useState(new Set(diasConfirmadosIniciales));
  const [pending, startTransition] = useTransition();

  const toggle = (fecha: string) => {
    const estaConfirmado = confirmados.has(fecha);
    setConfirmados((prev) => {
      const next = new Set(prev);
      if (estaConfirmado) next.delete(fecha);
      else next.add(fecha);
      return next;
    });
    startTransition(async () => {
      if (estaConfirmado) await quitarDiaEntrenamiento(token, fecha);
      else await confirmarDiaEntrenamiento(token, fecha);
    });
  };

  return (
    <div className="dp-surface rounded-2xl p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="dp-text-heading text-sm font-medium">¿Qué días vas a entrenar?</p>
        <ActivarNotificaciones token={token} />
      </div>
      <p className="dp-muted mb-3 text-xs">
        Marcá los días de las próximas dos semanas — tu profesional los va a ver, y si activaste los
        recordatorios te avisamos esa mañana.
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {dias.map((d) => {
          const activo = confirmados.has(d.fecha);
          return (
            <button
              key={d.fecha}
              type="button"
              onClick={() => toggle(d.fecha)}
              disabled={pending}
              className={`flex w-12 shrink-0 flex-col items-center gap-0.5 rounded-xl border py-2 text-xs transition-colors disabled:opacity-60 ${
                activo
                  ? "dp-bg-brand border-transparent text-white"
                  : d.esHoy
                    ? "dp-border-brand dp-text-heading border bg-white"
                    : "dp-body border-black/10 bg-white"
              }`}
            >
              <span className="text-[10px] uppercase opacity-80">{d.diaSemana}</span>
              <span className="font-mono text-sm font-semibold">{d.diaMes}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
