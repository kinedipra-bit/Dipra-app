"use client";

import { useState, useTransition } from "react";
import { crearEpisodio, actualizarEpisodio, eliminarEpisodio } from "./actions";
import { ALICIA_CAMPOS } from "@/lib/dipra/constants";
import type { EpisodioHistorialEntry } from "@/lib/dipra/types";

const ALICIA_PLACEHOLDERS: Record<(typeof ALICIA_CAMPOS)[number]["key"], string> = {
  antiguedad: "¿Cuándo comenzó el dolor?",
  localizacion: "¿Dónde le duele?",
  irradiacion: "¿Se extiende a otra parte del cuerpo?",
  caracter: "¿Cómo lo describe? (punzante, opresivo, quemante…)",
  intensidad: "Escala 0-10",
  atenuacionAgravacion: "¿Qué lo mejora o lo empeora?",
};

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime())
    ? f
    : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
}

function emptyAlicia(): Record<string, string> {
  return Object.fromEntries(ALICIA_CAMPOS.map((c) => [c.key, ""]));
}

export function EpisodiosSection({
  clienteId,
  initialItems,
}: {
  clienteId: string;
  initialItems: EpisodioHistorialEntry[];
}) {
  const [items, setItems] = useState<EpisodioHistorialEntry[]>(
    [...initialItems].sort((a, b) => b.fecha.localeCompare(a.fecha))
  );
  const [editingId, setEditingId] = useState<string | "new" | null>(
    initialItems.length > 0 ? [...initialItems].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].id : null
  );
  const [fecha, setFecha] = useState(items[0]?.fecha ?? new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState(items[0]?.motivo_consulta ?? "");
  const [alicia, setAlicia] = useState<Record<string, string>>(items[0]?.dolor_alicia ?? emptyAlicia());
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const setCampoAlicia = (key: string, value: string) => setAlicia((prev) => ({ ...prev, [key]: value }));

  const abrirNuevo = () => {
    setEditingId("new");
    setFecha(new Date().toISOString().slice(0, 10));
    setMotivo("");
    setAlicia(emptyAlicia());
  };

  const abrirEdicion = (entry: EpisodioHistorialEntry) => {
    setEditingId(entry.id);
    setFecha(entry.fecha);
    setMotivo(entry.motivo_consulta);
    setAlicia(entry.dolor_alicia);
  };

  const cerrar = () => setEditingId(null);

  const guardar = () => {
    if (!fecha) return;
    startTransition(async () => {
      if (editingId === "new") {
        const nuevo = await crearEpisodio(clienteId, fecha, motivo, alicia);
        setItems((prev) => [nuevo, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha)));
        setEditingId(nuevo.id);
      } else if (editingId) {
        await actualizarEpisodio(clienteId, editingId, fecha, motivo, alicia);
        setItems((prev) =>
          prev
            .map((it) => (it.id === editingId ? { ...it, fecha, motivo_consulta: motivo, dolor_alicia: alicia } : it))
            .sort((a, b) => b.fecha.localeCompare(a.fecha))
        );
      }
      setSavedAt(Date.now());
    });
  };

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar este episodio? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      await eliminarEpisodio(clienteId, id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      if (editingId === id) setEditingId(null);
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-medium dp-text-heading">Motivo de consulta · Dolor (ALICIA)</h2>
        <button
          type="button"
          onClick={abrirNuevo}
          className="dp-bg-brand rounded-lg px-3.5 py-1.5 text-sm font-medium text-white"
        >
          + Nuevo episodio
        </button>
      </div>
      <p className="dp-muted mb-3 text-xs">
        Un episodio por fecha — si el paciente vuelve por un motivo distinto, agregá uno nuevo en vez de
        editar el anterior. Los anteriores quedan siempre accesibles abajo.
      </p>

      {items.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <div key={it.id} className="dp-bg-faint flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px]">
              <span className="dp-muted font-mono">{fmtFecha(it.fecha)}</span>
              <span className="dp-text-heading max-w-48 truncate font-medium">
                {it.motivo_consulta || "(sin motivo)"}
              </span>
              <button
                type="button"
                onClick={() => abrirEdicion(it)}
                className="dp-text-brand font-medium hover:underline"
              >
                {editingId === it.id ? "Editando" : "Editar"}
              </button>
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

      {editingId === null ? (
        <p className="dp-muted py-3 text-center text-sm">Sin episodios registrados todavía.</p>
      ) : (
        <div className="border-t border-black/5 pt-4">
          <label className="mb-3 flex items-center gap-2 text-sm">
            <span className="dp-body font-medium">Fecha</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-lg border border-black/10 px-2 py-1 font-mono text-sm outline-none focus:dp-border-brand"
            />
          </label>

          <label className="mb-4 flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Objetivo / Motivo de consulta / Anamnesis</span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ej. Dolor lumbar de 3 meses tras volver a entrenar, busca volver a correr sin molestias…"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
            />
          </label>

          <p className="dp-muted mb-1 text-xs font-medium uppercase tracking-wide">Evaluación del dolor — ALICIA</p>
          <div className="mb-4 grid grid-cols-2 gap-3">
            {ALICIA_CAMPOS.map((c) => (
              <label key={c.key} className="flex flex-col gap-1 text-xs">
                <span className="dp-body font-medium">{c.label}</span>
                <input
                  value={alicia[c.key] || ""}
                  onChange={(e) => setCampoAlicia(c.key, e.target.value)}
                  placeholder={ALICIA_PLACEHOLDERS[c.key]}
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={guardar}
              disabled={pending || !fecha}
              className="dp-bg-brand rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Guardando…" : editingId === "new" ? "Guardar episodio" : "Guardar cambios"}
            </button>
            <button type="button" onClick={cerrar} disabled={pending} className="dp-muted text-sm hover:underline">
              Cerrar
            </button>
            {savedAt && !pending && <span className="dp-muted text-xs">Guardado.</span>}
          </div>
        </div>
      )}
    </section>
  );
}
