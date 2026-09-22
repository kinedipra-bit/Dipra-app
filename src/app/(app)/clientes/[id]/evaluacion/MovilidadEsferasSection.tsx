"use client";

import { useState, useTransition } from "react";
import { agregarMovilidadEsfera, actualizarMovilidadEsfera, eliminarMovilidadEsfera } from "./actions";
import { ESFERAS } from "@/lib/dipra/constants";
import type { MovilidadEsferaEntry } from "@/lib/dipra/types";

type EsferaKey = "craneo" | "torax" | "pelvis" | "tobillo";

const ESFERA_KEY: Record<(typeof ESFERAS)[number], EsferaKey> = {
  Cráneo: "craneo",
  Tórax: "torax",
  Pelvis: "pelvis",
  Tobillo: "tobillo",
};

export function MovilidadEsferasSection({
  clienteId,
  initialItems,
}: {
  clienteId: string;
  initialItems: MovilidadEsferaEntry[];
}) {
  const [items, setItems] = useState<MovilidadEsferaEntry[]>(initialItems);
  const [pending, startTransition] = useTransition();

  const agregar = () => {
    startTransition(async () => {
      const nuevo = await agregarMovilidadEsfera(clienteId);
      setItems((prev) => [...prev, nuevo]);
    });
  };

  const setCampo = (id: string, key: keyof MovilidadEsferaEntry, value: string) =>
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, [key]: value } : m)));

  const guardarCampo = (id: string, key: "patron" | EsferaKey, value: string) => {
    startTransition(async () => {
      await actualizarMovilidadEsfera(clienteId, id, { [key]: value });
    });
  };

  const quitar = (id: string) => {
    if (!confirm("¿Eliminar este patrón evaluado?")) return;
    startTransition(async () => {
      await eliminarMovilidadEsfera(clienteId, id);
      setItems((prev) => prev.filter((m) => m.id !== id));
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-medium dp-text-heading">Movilidad por esferas</h2>
        <button
          type="button"
          onClick={agregar}
          disabled={pending}
          className="dp-text-brand text-xs font-medium hover:underline disabled:opacity-50"
        >
          + Agregar patrón evaluado
        </button>
      </div>
      <p className="dp-muted mb-3 text-xs">
        Elige tú el patrón (ej. flexión global tocando punta de pie) y anota cómo se mueve cada esfera —
        cráneo, tórax, pelvis, tobillo. Los cambios se guardan al salir del campo.
      </p>

      {items.length === 0 && (
        <p className="dp-muted py-4 text-center text-sm">Sin patrones evaluados todavía.</p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((m) => (
          <div key={m.id} className="dp-bg-faint rounded-xl p-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                value={m.patron}
                onChange={(e) => setCampo(m.id, "patron", e.target.value)}
                onBlur={(e) => guardarCampo(m.id, "patron", e.target.value)}
                placeholder="Nombre del patrón (ej. Flexión global tocando punta de pie)"
                className="flex-1 rounded-lg border border-black/10 bg-white px-2 py-1 text-sm font-medium outline-none focus:dp-border-brand"
              />
              <button type="button" onClick={() => quitar(m.id)} className="dp-muted hover:dp-alert">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ESFERAS.map((esfera) => {
                const key = ESFERA_KEY[esfera];
                return (
                  <div key={esfera}>
                    <label className="dp-muted text-[10px] font-medium uppercase">{esfera}</label>
                    <textarea
                      rows={2}
                      value={m[key] || ""}
                      onChange={(e) => setCampo(m.id, key, e.target.value)}
                      onBlur={(e) => guardarCampo(m.id, key, e.target.value)}
                      className="mt-0.5 w-full rounded-md border border-black/10 bg-white px-1.5 py-1 text-xs outline-none focus:dp-border-brand"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
