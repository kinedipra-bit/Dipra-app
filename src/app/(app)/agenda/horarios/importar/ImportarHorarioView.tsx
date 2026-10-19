"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { DIAS_SEMANA_LARGO, TIPO_CITA_COLOR } from "@/lib/dipra/constants";
import { crearHorariosEnLote } from "../actions";
import { HORARIO_EXCEL } from "./datosExcel";

function mejorCandidato(nombreExcel: string, clientes: { id: string; nombre: string }[]) {
  const q = nombreExcel.trim().toLowerCase();
  const exacto = clientes.find((c) => c.nombre.trim().toLowerCase() === q);
  if (exacto) return exacto.id;
  const porPrefijo = clientes.filter((c) => c.nombre.trim().toLowerCase().startsWith(q));
  return porPrefijo.length === 1 ? porPrefijo[0].id : "";
}

export function ImportarHorarioView({ clientes }: { clientes: { id: string; nombre: string }[] }) {
  const nombresExcel = useMemo(() => [...new Set(HORARIO_EXCEL.map((e) => e.nombreExcel))].sort(), []);

  const [matches, setMatches] = useState<Record<string, string>>(() =>
    Object.fromEntries(nombresExcel.map((n) => [n, mejorCandidato(n, clientes)]))
  );
  const [importando, startImportar] = useTransition();
  const [hecho, setHecho] = useState<number | null>(null);

  const sinConfirmar = nombresExcel.filter((n) => !matches[n]);
  const listos = nombresExcel.length - sinConfirmar.length;

  const entradasPorNombre = useMemo(() => {
    const m = new Map<string, typeof HORARIO_EXCEL>();
    HORARIO_EXCEL.forEach((e) => {
      const lista = m.get(e.nombreExcel) ?? [];
      lista.push(e);
      m.set(e.nombreExcel, lista);
    });
    return m;
  }, []);

  const importar = () => {
    const entries = HORARIO_EXCEL.filter((e) => matches[e.nombreExcel]).map((e) => ({
      clientId: matches[e.nombreExcel],
      diaSemana: e.diaSemana,
      hora: e.hora,
      tipo: e.tipo,
    }));
    if (entries.length === 0) return;
    startImportar(async () => {
      await crearHorariosEnLote(entries);
      setHecho(entries.length);
    });
  };

  if (hecho !== null) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="dp-text-brand text-lg font-medium">✓ Se cargaron {hecho} horarios.</p>
        <Link href="/agenda/horarios" className="dp-bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white">
          Ver Horarios →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold dp-text-heading">
            Importar horario desde el Excel
          </h1>
          <p className="dp-muted text-xs">
            La semana del 19-23 de octubre que ya estaba en el Excel — confirmá a qué cliente de la base
            corresponde cada nombre y tocá &quot;Importar&quot; una sola vez.
          </p>
        </div>
        <Link href="/agenda/horarios" className="dp-text-brand text-sm hover:underline">
          ← Horarios
        </Link>
      </div>

      <div className="dp-surface flex items-center justify-between rounded-2xl p-4 shadow-sm">
        <span className="dp-body text-sm">
          {listos} de {nombresExcel.length} nombres confirmados
          {sinConfirmar.length > 0 && (
            <span className="dp-alert"> — faltan: {sinConfirmar.join(", ")}</span>
          )}
        </span>
        <button
          type="button"
          onClick={importar}
          disabled={importando || listos === 0}
          className="dp-bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {importando ? "Importando…" : `Importar ${listos > 0 ? `(${listos})` : ""}`}
        </button>
      </div>

      <div className="dp-surface divide-y divide-black/5 rounded-2xl shadow-sm">
        {nombresExcel.map((nombre) => {
          const entradas = entradasPorNombre.get(nombre) ?? [];
          return (
            <div key={nombre} className="flex flex-wrap items-center gap-3 p-3">
              <span className="dp-text-heading w-28 shrink-0 text-sm font-medium">{nombre}</span>
              <select
                value={matches[nombre]}
                onChange={(e) => setMatches((prev) => ({ ...prev, [nombre]: e.target.value }))}
                className={`w-56 shrink-0 rounded-lg border px-2 py-1 text-sm outline-none focus:dp-border-brand ${
                  matches[nombre] ? "border-black/10" : "dp-border-alert"
                }`}
              >
                <option value="">Elegí el cliente…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <div className="flex flex-1 flex-wrap gap-1">
                {entradas.map((e, i) => (
                  <span
                    key={i}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium dp-text-heading ${
                      TIPO_CITA_COLOR[e.tipo as keyof typeof TIPO_CITA_COLOR] ?? "dp-bg-faint"
                    }`}
                  >
                    {DIAS_SEMANA_LARGO[e.diaSemana].slice(0, 3)} {e.hora}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
