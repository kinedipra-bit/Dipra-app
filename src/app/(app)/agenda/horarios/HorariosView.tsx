"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { DIAS_SEMANA_CORTO, DIAS_SEMANA_LARGO, TIPOS_CITA, TIPO_CITA_COLOR } from "@/lib/dipra/constants";
import {
  actualizarHorario,
  crearHorario,
  eliminarHorario,
  generarCitasDesdeHorarios,
  type HorarioConCliente,
} from "./actions";

// Franjas cada 30 min, 7:00 a 20:00 — mismo rango que la planilla vieja.
function franjas() {
  const horas: string[] = [];
  for (let h = 7; h <= 19; h++) {
    horas.push(`${String(h).padStart(2, "0")}:00`);
    horas.push(`${String(h).padStart(2, "0")}:30`);
  }
  horas.push("20:00");
  return horas;
}
const FRANJAS = franjas();

function fmtHora(h: string) {
  return h.slice(0, 5);
}

export function HorariosView({
  horariosIniciales,
  clientes,
}: {
  horariosIniciales: HorarioConCliente[];
  clientes: { id: string; nombre: string }[];
}) {
  const [horarios, setHorarios] = useState(horariosIniciales);
  const [editando, setEditando] = useState<HorarioConCliente | "nuevo" | null>(null);
  const [nombreCliente, setNombreCliente] = useState("");
  const [diaSemana, setDiaSemana] = useState(0);
  const [hora, setHora] = useState("09:00");
  const [tipo, setTipo] = useState<string>(TIPOS_CITA[0]);
  const [pending, startTransition] = useTransition();
  const [semanas, setSemanas] = useState(4);
  const [generando, startGenerar] = useTransition();
  const [resultado, setResultado] = useState<string | null>(null);

  const clienteElegido = useMemo(() => {
    const q = nombreCliente.trim().toLowerCase();
    if (!q) return undefined;
    return clientes.find((c) => c.nombre.trim().toLowerCase() === q);
  }, [nombreCliente, clientes]);

  const porCelda = useMemo(() => {
    const m = new Map<string, HorarioConCliente[]>();
    horarios.forEach((h) => {
      const key = `${h.dia_semana}-${fmtHora(h.hora)}`;
      const lista = m.get(key) ?? [];
      lista.push(h);
      m.set(key, lista);
    });
    return m;
  }, [horarios]);

  const abrirNuevo = (dia?: number, horaClic?: string) => {
    setEditando("nuevo");
    setNombreCliente("");
    setDiaSemana(dia ?? 0);
    setHora(horaClic ?? "09:00");
    setTipo(TIPOS_CITA[0]);
  };

  const abrirEdicion = (h: HorarioConCliente) => {
    setEditando(h);
    setNombreCliente(h.cliente_nombre);
    setDiaSemana(h.dia_semana);
    setHora(fmtHora(h.hora));
    setTipo(h.tipo);
  };

  const cerrar = () => setEditando(null);

  const guardar = () => {
    if (editando === "nuevo") {
      if (!clienteElegido) return;
      startTransition(async () => {
        const creado = await crearHorario({ clientId: clienteElegido.id, diaSemana, hora, tipo });
        setHorarios((prev) => [...prev, creado]);
        setEditando(null);
      });
      return;
    }
    if (!editando) return;
    const id = editando.id;
    startTransition(async () => {
      await actualizarHorario(id, { dia_semana: diaSemana, hora, tipo });
      setHorarios((prev) =>
        prev.map((h) => (h.id === id ? { ...h, dia_semana: diaSemana, hora, tipo } : h))
      );
      setEditando(null);
    });
  };

  const borrar = () => {
    if (editando === "nuevo" || !editando) return;
    if (!confirm(`¿Eliminar este horario de ${editando.cliente_nombre}?`)) return;
    const id = editando.id;
    startTransition(async () => {
      await eliminarHorario(id);
      setHorarios((prev) => prev.filter((h) => h.id !== id));
      setEditando(null);
    });
  };

  const generar = () => {
    setResultado(null);
    startGenerar(async () => {
      const r = await generarCitasDesdeHorarios(semanas);
      const partes = [`${r.creadas} citas creadas`];
      if (r.yaExistian > 0) partes.push(`${r.yaExistian} ya existían`);
      if (r.saltadasFeriado > 0) partes.push(`${r.saltadasFeriado} saltadas por feriado`);
      setResultado(partes.join(" · "));
    });
  };

  const inputClass = "rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold dp-text-heading">
            Horarios
          </h1>
          <p className="dp-muted text-xs">
            El horario semanal de cada cliente — &quot;Generar citas&quot; arma automáticamente la Agenda a
            partir de esto.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/agenda/horarios/importar" className="dp-text-brand text-sm hover:underline">
            Importar desde Excel →
          </Link>
          <Link href="/agenda" className="dp-text-brand text-sm hover:underline">
            ← Agenda
          </Link>
        </div>
      </div>

      <div className="dp-surface flex flex-wrap items-center gap-3 rounded-2xl p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm">
          <span className="dp-body font-medium">Generar citas para las próximas</span>
          <input
            type="number"
            min={1}
            max={12}
            value={semanas}
            onChange={(e) => setSemanas(Number(e.target.value) || 1)}
            className={`${inputClass} w-16 text-center`}
          />
          <span className="dp-body">semanas</span>
        </label>
        <button
          type="button"
          onClick={generar}
          disabled={generando}
          className="dp-bg-brand rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {generando ? "Generando…" : "Generar citas"}
        </button>
        {resultado && <span className="dp-text-brand text-xs font-medium">{resultado}</span>}
        <span className="dp-muted text-xs">
          Salta feriados automático y nunca duplica una cita que ya exista.
        </span>
      </div>

      <div className="dp-surface overflow-x-auto rounded-2xl p-4 shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="dp-muted w-14 p-1 text-left font-medium">Hora</th>
              {DIAS_SEMANA_LARGO.map((d, i) => (
                <th key={d} className="dp-text-heading p-1 text-left font-semibold">
                  <button type="button" onClick={() => abrirNuevo(i)} className="hover:dp-text-brand">
                    {d}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FRANJAS.map((f) => (
              <tr key={f} className="border-t border-black/5">
                <td className="dp-muted py-1 pr-2 font-mono">{f}</td>
                {DIAS_SEMANA_CORTO.map((_, dia) => {
                  const celda = porCelda.get(`${dia}-${f}`) ?? [];
                  return (
                    <td key={dia} className="p-1 align-top">
                      <div className="flex min-h-6 flex-col gap-0.5">
                        {celda.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => abrirEdicion(h)}
                            title={h.tipo}
                            className={`truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium dp-text-heading ${
                              TIPO_CITA_COLOR[h.tipo as keyof typeof TIPO_CITA_COLOR] ?? "dp-bg-faint"
                            }`}
                          >
                            {h.cliente_nombre}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => abrirNuevo(dia, f)}
                          className="dp-muted hover:dp-text-brand text-left text-[10px] opacity-0 hover:opacity-100 focus:opacity-100"
                        >
                          + agregar
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {TIPOS_CITA.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded ${TIPO_CITA_COLOR[t]}`} />
            <span className="dp-muted">{t}</span>
          </span>
        ))}
      </div>

      {editando !== null && (
        <div className="dp-bg-scrim fixed inset-0 z-20 flex items-center justify-center p-4" onClick={cerrar}>
          <div
            className="dp-surface flex w-full max-w-sm flex-col gap-3 rounded-2xl p-5 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="dp-text-heading font-medium">
              {editando === "nuevo" ? "Nuevo horario" : `Editar horario de ${editando.cliente_nombre}`}
            </h2>

            {editando === "nuevo" && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Cliente</span>
                <input
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  list="horarios-clientes-datalist"
                  placeholder="Empezá a escribir el nombre…"
                  className={inputClass}
                  autoFocus
                />
                <datalist id="horarios-clientes-datalist">
                  {clientes.map((c) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
                </datalist>
                {nombreCliente.trim() && !clienteElegido && (
                  <span className="dp-alert text-xs">No encontramos a nadie con ese nombre exacto.</span>
                )}
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Día</span>
                <select
                  value={diaSemana}
                  onChange={(e) => setDiaSemana(Number(e.target.value))}
                  className={inputClass}
                >
                  {DIAS_SEMANA_LARGO.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="dp-body font-medium">Hora</span>
                <select value={hora} onChange={(e) => setHora(e.target.value)} className={inputClass}>
                  {FRANJAS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Tipo</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClass}>
                {TIPOS_CITA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={guardar}
                disabled={pending || (editando === "nuevo" && !clienteElegido)}
                className="dp-bg-brand rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {pending ? "Guardando…" : "Guardar"}
              </button>
              {editando !== "nuevo" && (
                <button
                  type="button"
                  onClick={borrar}
                  disabled={pending}
                  className="dp-alert text-sm hover:underline disabled:opacity-50"
                >
                  Eliminar
                </button>
              )}
              <button type="button" onClick={cerrar} className="dp-muted text-sm hover:underline">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
