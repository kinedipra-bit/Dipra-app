"use client";

import { useState, useTransition } from "react";
import { crearMovilidadArticular, eliminarMovilidadArticular } from "./actions";
import type { MovilidadArticularEntry } from "@/lib/dipra/types";

type CampoKey =
  | "hombro_der"
  | "hombro_izq"
  | "cadera_der"
  | "cadera_izq"
  | "tobillo_der"
  | "tobillo_izq"
  | "columna_extension"
  | "columna_flexion"
  | "columna_rotacion_der"
  | "columna_rotacion_izq";

type Draft = Record<CampoKey, string> & { fecha: string; notas: string };

const CAMPOS: { key: CampoKey; label: string }[] = [
  { key: "hombro_der", label: "Hombro · derecho" },
  { key: "hombro_izq", label: "Hombro · izquierdo" },
  { key: "cadera_der", label: "Cadera · derecha" },
  { key: "cadera_izq", label: "Cadera · izquierda" },
  { key: "tobillo_der", label: "Tobillo · derecho" },
  { key: "tobillo_izq", label: "Tobillo · izquierdo" },
  { key: "columna_extension", label: "Columna · extensión" },
  { key: "columna_flexion", label: "Columna · flexión" },
  { key: "columna_rotacion_der", label: "Columna · rotación torácica der" },
  { key: "columna_rotacion_izq", label: "Columna · rotación torácica izq" },
];

function draftVacio(): Draft {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    notas: "",
    hombro_der: "",
    hombro_izq: "",
    cadera_der: "",
    cadera_izq: "",
    tobillo_der: "",
    tobillo_izq: "",
    columna_extension: "",
    columna_flexion: "",
    columna_rotacion_der: "",
    columna_rotacion_izq: "",
  };
}

function scoreClass(v: number | null) {
  if (v === 0 || v === 1) return "dp-bg-alert text-white";
  if (v === 2) return "dp-bg-amber text-white";
  if (v === 3) return "dp-bg-faint dp-text-heading";
  return "dp-muted";
}

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime())
    ? f
    : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
}

function promedio(entry: MovilidadArticularEntry) {
  const vals = CAMPOS.map((c) => entry[c.key]).filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export function MovilidadArticularSection({
  clienteId,
  initialItems,
}: {
  clienteId: string;
  initialItems: MovilidadArticularEntry[];
}) {
  const [items, setItems] = useState<MovilidadArticularEntry[]>(
    [...initialItems].sort((a, b) => b.fecha.localeCompare(a.fecha))
  );
  const [abierto, setAbierto] = useState(false);
  const [draft, setDraft] = useState<Draft>(draftVacio());
  const [pending, startTransition] = useTransition();

  const abrirNueva = () => {
    setDraft(draftVacio());
    setAbierto(true);
  };

  const cerrar = () => setAbierto(false);

  const setCampo = (key: CampoKey, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));

  const guardar = () => {
    if (!draft.fecha) return;
    startTransition(async () => {
      const input = {
        fecha: draft.fecha,
        notas: draft.notas,
        ...Object.fromEntries(
          CAMPOS.map((c) => [c.key, draft[c.key] === "" ? null : Number(draft[c.key])])
        ),
      } as Omit<MovilidadArticularEntry, "id" | "client_id" | "created_at">;
      const nueva = await crearMovilidadArticular(clienteId, input);
      setItems((prev) => [nueva, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha)));
      setAbierto(false);
    });
  };

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar esta evaluación de movilidad articular? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      await eliminarMovilidadArticular(clienteId, id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-medium dp-text-heading">Movilidad articular</h2>
        {!abierto && (
          <button
            type="button"
            onClick={abrirNueva}
            className="dp-bg-brand rounded-lg px-3.5 py-1.5 text-sm font-medium text-white"
          >
            + Nueva evaluación
          </button>
        )}
      </div>
      <p className="dp-muted mb-3 text-xs">
        Escala 0-3 por articulación, misma lógica que el FMS (0 = dolor, 3 = sin limitación). Queda guardada
        por fecha.
      </p>

      {items.length === 0 && !abierto ? (
        <p className="dp-muted py-3 text-center text-sm">Sin evaluaciones de movilidad registradas todavía.</p>
      ) : (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <div key={it.id} className="dp-bg-faint flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px]">
              <span className="dp-muted font-mono">{fmtFecha(it.fecha)}</span>
              <span className="dp-text-heading font-medium">
                {promedio(it) ?? "—"}
                <span className="dp-muted">/3 prom.</span>
              </span>
              <button
                type="button"
                onClick={() => eliminar(it.id)}
                disabled={pending}
                className="dp-muted hover:dp-alert disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {abierto && (
        <div className="border-t border-black/5 pt-4">
          <label className="mb-3 flex items-center gap-2 text-sm">
            <span className="dp-body font-medium">Fecha</span>
            <input
              type="date"
              value={draft.fecha}
              onChange={(e) => setDraft((prev) => ({ ...prev, fecha: e.target.value }))}
              className="rounded-lg border border-black/10 px-2 py-1 font-mono text-sm outline-none focus:dp-border-brand"
            />
          </label>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {CAMPOS.map((c) => {
              const raw = draft[c.key];
              const num = raw === "" ? null : Number(raw);
              return (
                <div
                  key={c.key}
                  className="flex items-center justify-between gap-2 border-b border-black/5 py-1.5"
                >
                  <span className="dp-body text-sm">{c.label}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={3}
                      value={raw}
                      onChange={(e) => setCampo(c.key, e.target.value)}
                      className="w-14 rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-sm outline-none focus:dp-border-brand"
                    />
                    <span className={`w-6 rounded-md text-center text-xs font-semibold ${scoreClass(num)}`}>
                      {num ?? "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <label className="mt-3 block">
            <span className="dp-muted text-[10px] font-medium uppercase tracking-wide">Notas</span>
            <textarea
              value={draft.notas}
              onChange={(e) => setDraft((prev) => ({ ...prev, notas: e.target.value }))}
              rows={2}
              className="mt-0.5 w-full rounded-lg border border-black/10 px-2 py-1 text-sm outline-none focus:dp-border-brand"
            />
          </label>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={guardar}
              disabled={pending || !draft.fecha}
              className="dp-bg-brand rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar evaluación"}
            </button>
            <button type="button" onClick={cerrar} disabled={pending} className="dp-muted text-sm hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
