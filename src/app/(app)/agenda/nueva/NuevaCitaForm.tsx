"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ESTADOS_CITA, TIPOS_CITA } from "@/lib/dipra/constants";
import type { Cita } from "@/lib/dipra/types";
import { crearCita, obtenerDiasPlan } from "../actions";

function labelEstado(estado: (typeof ESTADOS_CITA)[number]) {
  return estado === "alerta" ? "Alerta leve" : estado.charAt(0).toUpperCase() + estado.slice(1);
}

export function NuevaCitaForm({
  clientes,
  clienteIdInicial,
  clienteNombreInicial,
  fechaInicial,
}: {
  clientes: { id: string; nombre: string }[];
  clienteIdInicial: string;
  clienteNombreInicial: string;
  fechaInicial: string;
}) {
  const [busqueda, setBusqueda] = useState(clienteNombreInicial);
  const [clienteId, setClienteId] = useState(clienteIdInicial || clientes[0]?.id || "");
  const [fecha, setFecha] = useState(fechaInicial);
  const [hora, setHora] = useState("09:00");
  const [tipo, setTipo] = useState<string>(TIPOS_CITA[0]);
  const [estado, setEstado] = useState<Cita["estado"]>("pendiente");
  const [diasPlan, setDiasPlan] = useState<{ id: string; label: string }[]>([]);
  const [diaPlanLabel, setDiaPlanLabel] = useState("");
  const [pending, startTransition] = useTransition();

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [busqueda, clientes]);

  // Si la búsqueda deja afuera al cliente seleccionado, se cae al primero
  // de los resultados filtrados para que el <select> y el envío coincidan.
  const clienteIdEfectivo = filtrados.some((c) => c.id === clienteId) ? clienteId : filtrados[0]?.id ?? "";

  // Al cambiar de cliente, trae los días de su semana activa para el
  // selector "Día del plan" — permite cruzar la agenda real con el
  // recordatorio de descanso por grupo muscular (ver ResumenProgramacion).
  useEffect(() => {
    if (!clienteIdEfectivo) return;
    let cancelado = false;
    obtenerDiasPlan(clienteIdEfectivo).then((dias) => {
      if (cancelado) return;
      setDiasPlan(dias);
      setDiaPlanLabel((prev) => (dias.some((d) => d.label === prev) ? prev : ""));
    });
    return () => {
      cancelado = true;
    };
  }, [clienteIdEfectivo]);

  const inputClass = "rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand";

  const submit = () => {
    const cliente = clientes.find((c) => c.id === clienteIdEfectivo);
    if (!cliente) return;
    startTransition(() => {
      crearCita({
        client_id: cliente.id,
        cliente_nombre: cliente.nombre,
        fecha,
        hora,
        tipo,
        estado,
        dia_plan_label: diaPlanLabel || null,
      });
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/agenda" className="dp-muted text-sm hover:dp-text-brand">
          ← Agenda
        </Link>
      </div>

      <div className="dp-surface mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl p-6 shadow-sm">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold dp-text-heading">
          Agendar sesión
        </h1>

        {clientes.length === 0 ? (
          <p className="dp-muted text-sm">Todavía no hay clientes cargados para agendar.</p>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Buscar cliente</span>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre del cliente…"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Cliente</span>
              <select
                value={clienteIdEfectivo}
                onChange={(e) => setClienteId(e.target.value)}
                className={inputClass}
              >
                {filtrados.length === 0 && <option value="">Sin resultados</option>}
                {filtrados.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Fecha</span>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Hora</span>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Tipo de sesión</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClass}>
                {TIPOS_CITA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            {diasPlan.length > 0 && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Día del plan (opcional)</span>
                <select
                  value={diaPlanLabel}
                  onChange={(e) => setDiaPlanLabel(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Sin asignar</option>
                  {diasPlan.map((d) => (
                    <option key={d.id} value={d.label}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Estado inicial</span>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as Cita["estado"])}
                className={inputClass}
              >
                {ESTADOS_CITA.map((e) => (
                  <option key={e} value={e}>
                    {labelEstado(e)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={submit}
              disabled={!clienteIdEfectivo || pending}
              className="dp-bg-brand mt-2 rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {pending ? "Agendando…" : "Agendar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
