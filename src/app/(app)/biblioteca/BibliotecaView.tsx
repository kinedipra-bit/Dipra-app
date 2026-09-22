"use client";

import { useState, useTransition } from "react";
import type { EjercicioBiblioteca } from "@/lib/dipra/types";
import { crearEjercicioBiblioteca, actualizarEjercicioBiblioteca, eliminarEjercicioBiblioteca } from "./actions";

/**
 * Biblioteca de ejercicios. Migrado desde BibliotecaView (dipra-app.jsx
 * líneas 2478-2560).
 *
 * Decisión de persistencia: a diferencia del prototipo (que reescribía el
 * array completo de biblioteca en cada tecla vía onUpdate), acá cada fila
 * es una fila real en `biblioteca_ejercicios`. El estado local se actualiza
 * de forma optimista en cada tecla (para que la edición se sienta igual de
 * fluida que el original) y el guardado real contra Supabase se dispara en
 * onBlur del campo — evita un update por tecla contra la base.
 */
export function BibliotecaView({ bibliotecaInicial }: { bibliotecaInicial: EjercicioBiblioteca[] }) {
  const [biblioteca, setBiblioteca] = useState<EjercicioBiblioteca[]>(bibliotecaInicial);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoLink, setNuevoLink] = useState("");
  const [creando, startCrear] = useTransition();
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const filtrados = biblioteca.filter((b) => b.nombre.toLowerCase().includes(q.toLowerCase()));

  const editarCampo = (id: string, patch: Partial<Pick<EjercicioBiblioteca, "nombre" | "link">>) => {
    setBiblioteca((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const persistirCampo = (id: string, patch: Partial<Pick<EjercicioBiblioteca, "nombre" | "link">>) => {
    void actualizarEjercicioBiblioteca(id, patch);
  };

  const eliminar = (b: EjercicioBiblioteca) => {
    if (!confirm(`¿Eliminar "${b.nombre}" de la biblioteca?`)) return;
    setEliminandoId(b.id);
    setBiblioteca((prev) => prev.filter((x) => x.id !== b.id));
    void eliminarEjercicioBiblioteca(b.id).finally(() => setEliminandoId(null));
  };

  const agregar = () => {
    if (!nuevoNombre.trim()) return;
    startCrear(async () => {
      const creado = await crearEjercicioBiblioteca(nuevoNombre, nuevoLink);
      setBiblioteca((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNuevoNombre("");
      setNuevoLink("");
      setShowAdd(false);
    });
  };

  const inputClass = "rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="dp-text-heading font-[family-name:var(--font-display)] text-2xl font-semibold">
            Biblioteca de ejercicios
          </h1>
          <p className="dp-muted mt-0.5 text-sm">
            {biblioteca.length} ejercicios · se sugieren automáticamente al planificar
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="dp-bg-brand flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-white"
        >
          + Agregar ejercicio
        </button>
      </div>

      {showAdd && (
        <div className="dp-surface flex items-end gap-3 rounded-2xl p-4 shadow-sm">
          <div className="flex-1">
            <label className="dp-body text-xs font-medium">Nombre</label>
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej. Goblet squat"
              className={`mt-1 w-full ${inputClass}`}
            />
          </div>
          <div className="flex-1">
            <label className="dp-body text-xs font-medium">Link del video</label>
            <input
              value={nuevoLink}
              onChange={(e) => setNuevoLink(e.target.value)}
              placeholder="https://youtube.com/…"
              className={`mt-1 w-full ${inputClass}`}
            />
          </div>
          <button
            type="button"
            onClick={agregar}
            disabled={!nuevoNombre.trim() || creando}
            className="dp-bg-brand rounded-lg px-4 py-1.5 font-medium text-white disabled:opacity-40"
          >
            {creando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar ejercicio…"
        className="dp-surface w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:dp-border-brand"
      />

      <div className="dp-surface divide-y divide-black/5 rounded-2xl shadow-sm">
        {filtrados.length === 0 && (
          <p className="dp-muted py-10 text-center text-sm">Ningún ejercicio coincide con &quot;{q}&quot;.</p>
        )}
        {filtrados.map((b) => (
          <div key={b.id} className="flex items-center gap-3 p-3">
            <input
              value={b.nombre}
              onChange={(e) => editarCampo(b.id, { nombre: e.target.value })}
              onBlur={(e) => persistirCampo(b.id, { nombre: e.target.value })}
              className="dp-ink flex-1 border-none bg-transparent text-sm outline-none"
            />
            <input
              value={b.link || ""}
              onChange={(e) => editarCampo(b.id, { link: e.target.value })}
              onBlur={(e) => persistirCampo(b.id, { link: e.target.value })}
              placeholder="Sin link — pégalo aquí"
              className="dp-text-brand flex-1 border-none bg-transparent text-xs outline-none"
            />
            {b.link && (
              <a
                href={b.link}
                target="_blank"
                rel="noreferrer"
                title="Abrir video"
                className="dp-muted hover:dp-ink shrink-0 text-xs font-medium underline"
              >
                Ver
              </a>
            )}
            <button
              type="button"
              onClick={() => eliminar(b)}
              disabled={eliminandoId === b.id}
              className="dp-muted hover:dp-alert shrink-0 text-sm disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
