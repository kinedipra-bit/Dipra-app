"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ESTADOS_CITA, TIPOS_CITA } from "@/lib/dipra/constants";
import type { Cita, Grupo } from "@/lib/dipra/types";
import { contarSesionesKinesiologia, crearCita, crearCitaGrupal, obtenerDiasPlan } from "../actions";

function labelEstado(estado: (typeof ESTADOS_CITA)[number]) {
  if (estado === "alerta") return "Alerta leve";
  if (estado === "no_asistio") return "No asistió";
  return estado.charAt(0).toUpperCase() + estado.slice(1);
}

export function NuevaCitaForm({
  clientes,
  grupos,
  clienteIdInicial,
  clienteNombreInicial,
  fechaInicial,
  horaInicial,
}: {
  clientes: { id: string; nombre: string }[];
  grupos: Grupo[];
  clienteIdInicial: string;
  clienteNombreInicial: string;
  fechaInicial: string;
  horaInicial: string;
}) {
  const nombreInicial =
    clienteNombreInicial || clientes.find((c) => c.id === clienteIdInicial)?.nombre || "";
  const [esGrupal, setEsGrupal] = useState(false);
  const [grupoId, setGrupoId] = useState("");
  const [nombreCliente, setNombreCliente] = useState(nombreInicial);
  const [sinFicha, setSinFicha] = useState(false);
  const [nombreLibre, setNombreLibre] = useState("");
  const [fecha, setFecha] = useState(fechaInicial);
  const [hora, setHora] = useState(horaInicial);
  const [tipo, setTipo] = useState<string>(TIPOS_CITA[0]);
  const [estado, setEstado] = useState<Cita["estado"]>("pendiente");
  const [diasPlan, setDiasPlan] = useState<{ id: string; label: string }[]>([]);
  const [diaPlanLabel, setDiaPlanLabel] = useState("");
  const [sesionesKine, setSesionesKine] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  // Coincidencia exacta (sin mayúsculas/acentos de más) con lo que se
  // escribió o se eligió de la lista sugerida — con 100 clientes no tiene
  // sentido hacerlo elegir de un <select> aparte, tipea y el navegador le
  // sugiere solo.
  const clienteElegido = useMemo(() => {
    const q = nombreCliente.trim().toLowerCase();
    if (!q) return undefined;
    return clientes.find((c) => c.nombre.trim().toLowerCase() === q);
  }, [nombreCliente, clientes]);
  const clienteIdEfectivo = clienteElegido?.id ?? "";

  const mostrarDiaPlan = tipo === "Rendimiento" && !sinFicha;
  const mostrarContadorKine = tipo === "Kinesiología" && !sinFicha;

  // Al cambiar de cliente, trae los días de su semana activa para el
  // selector "Día del plan" — solo tiene sentido para "Rendimiento" (los
  // demás tipos no siguen un día puntual del plan).
  useEffect(() => {
    if (!clienteIdEfectivo || tipo !== "Rendimiento" || sinFicha) return;
    let cancelado = false;
    obtenerDiasPlan(clienteIdEfectivo).then((dias) => {
      if (cancelado) return;
      setDiasPlan(dias);
      setDiaPlanLabel((prev) => (dias.some((d) => d.label === prev) ? prev : ""));
    });
    return () => {
      cancelado = true;
    };
  }, [clienteIdEfectivo, tipo, sinFicha]);

  // Cuántas sesiones de kinesiología lleva ya agendadas este cliente, para
  // mostrar "sería la sesión N° X" sin tener que contarlas a mano.
  useEffect(() => {
    if (!clienteIdEfectivo || tipo !== "Kinesiología" || sinFicha) return;
    let cancelado = false;
    contarSesionesKinesiologia(clienteIdEfectivo).then((n) => {
      if (!cancelado) setSesionesKine(n);
    });
    return () => {
      cancelado = true;
    };
  }, [clienteIdEfectivo, tipo, sinFicha]);

  const inputClass = "rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand";

  const submit = () => {
    if (esGrupal) {
      if (!grupoId) return;
      startTransition(() => {
        crearCitaGrupal({ grupoId, fecha, hora, estado });
      });
      return;
    }

    if (sinFicha) {
      const nombre = nombreLibre.trim();
      if (!nombre) return;
      startTransition(() => {
        crearCita({
          client_id: null,
          cliente_nombre: nombre,
          fecha,
          hora,
          tipo,
          estado,
          dia_plan_label: null,
        });
      });
      return;
    }

    if (!clienteElegido) return;
    startTransition(() => {
      crearCita({
        client_id: clienteElegido.id,
        cliente_nombre: clienteElegido.nombre,
        fecha,
        hora,
        tipo,
        estado,
        dia_plan_label: mostrarDiaPlan ? diaPlanLabel || null : null,
      });
    });
  };

  const puedeAgendar = esGrupal ? !!grupoId : sinFicha ? !!nombreLibre.trim() : !!clienteIdEfectivo;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href={`/agenda/dia?fecha=${fecha}`} className="dp-muted text-sm hover:dp-text-brand">
          ← Agenda
        </Link>
      </div>

      <div className="dp-surface mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl p-6 shadow-sm">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold dp-text-heading">
          Agendar sesión
        </h1>

        {grupos.length > 0 && (
          <button
            type="button"
            onClick={() => setEsGrupal((v) => !v)}
            className="dp-text-brand w-fit text-xs hover:underline"
          >
            {esGrupal ? "← Agendar una sesión individual" : "¿Es un entrenamiento grupal? Elegir un grupo"}
          </button>
        )}

        {esGrupal ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Grupo</span>
              <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className={inputClass} autoFocus>
                <option value="">Elegí un grupo…</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
              <span className="dp-muted text-xs">Se agenda una cita para cada persona del roster de ese grupo.</span>
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

            <button
              type="button"
              onClick={submit}
              disabled={!puedeAgendar || pending}
              className="dp-bg-brand mt-2 rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {pending ? "Agendando…" : "Agendar clase grupal"}
            </button>
          </>
        ) : clientes.length === 0 && !sinFicha ? (
          <p className="dp-muted text-sm">Todavía no hay clientes cargados para agendar.</p>
        ) : (
          <>
            {sinFicha ? (
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Nombre</span>
                <input
                  value={nombreLibre}
                  onChange={(e) => setNombreLibre(e.target.value)}
                  placeholder="Nombre completo…"
                  className={inputClass}
                  autoFocus
                />
              </label>
            ) : (
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Cliente</span>
                <input
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  list="clientes-datalist"
                  placeholder="Empezá a escribir el nombre…"
                  className={inputClass}
                  autoFocus
                />
                <datalist id="clientes-datalist">
                  {clientes.map((c) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
                </datalist>
                {nombreCliente.trim() && !clienteElegido && (
                  <span className="dp-alert text-xs">No encontramos a nadie con ese nombre exacto.</span>
                )}
              </label>
            )}

            <button
              type="button"
              onClick={() => setSinFicha((v) => !v)}
              className="dp-text-brand w-fit text-xs hover:underline"
            >
              {sinFicha ? "← Elegir un cliente con ficha" : "¿Todavía no tiene ficha? Agendar solo con el nombre"}
            </button>

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

            {mostrarContadorKine && sesionesKine !== null && (
              <p className="dp-muted text-xs">
                {sesionesKine === 0
                  ? "Sería su primera sesión de kinesiología."
                  : `Sería la sesión N° ${sesionesKine + 1} de kinesiología.`}
              </p>
            )}

            {mostrarDiaPlan && diasPlan.length > 0 && (
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
              disabled={!puedeAgendar || pending}
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
