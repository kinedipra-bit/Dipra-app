"use client";

import { useState, useTransition } from "react";
import {
  agregarEvaluacionCustom,
  actualizarEvaluacionCustom,
  eliminarEvaluacionCustom,
} from "./actions";
import type { EvaluacionCustomEntry } from "@/lib/dipra/types";

export function EvaluacionesCustomSection({
  clienteId,
  initialItems,
}: {
  clienteId: string;
  initialItems: EvaluacionCustomEntry[];
}) {
  const [items, setItems] = useState<EvaluacionCustomEntry[]>(initialItems);
  const [pending, startTransition] = useTransition();

  const agregar = () => {
    startTransition(async () => {
      const nuevo = await agregarEvaluacionCustom(clienteId);
      setItems((prev) => [...prev, nuevo]);
    });
  };

  const setCampo = (id: string, patch: Partial<Pick<EvaluacionCustomEntry, "nombre" | "resultado">>) =>
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const guardarCampo = (
    id: string,
    patch: Partial<Pick<EvaluacionCustomEntry, "nombre" | "resultado">>
  ) => {
    startTransition(async () => {
      await actualizarEvaluacionCustom(clienteId, id, patch);
    });
  };

  const quitar = (id: string) => {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    startTransition(async () => {
      await eliminarEvaluacionCustom(clienteId, id);
      setItems((prev) => prev.filter((e) => e.id !== id));
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-medium dp-text-heading">Evaluaciones específicas</h2>
        <button
          type="button"
          onClick={agregar}
          disabled={pending}
          className="dp-text-brand text-xs font-medium hover:underline disabled:opacity-50"
        >
          + Agregar evaluación
        </button>
      </div>
      <p className="dp-muted mb-3 text-xs">
        Pruebas puntuales según cada paciente — ej. Up and go test, unipodal test, knee to wall. Los
        cambios se guardan al salir del campo.
      </p>

      {items.length === 0 && (
        <p className="dp-muted py-4 text-center text-sm">Sin evaluaciones específicas agregadas.</p>
      )}

      <div className="flex flex-col gap-2">
        {items.map((e) => (
          <div key={e.id} className="flex items-center gap-2">
            <input
              value={e.nombre}
              onChange={(ev) => setCampo(e.id, { nombre: ev.target.value })}
              onBlur={(ev) => guardarCampo(e.id, { nombre: ev.target.value })}
              placeholder="Nombre del test"
              className="w-40 rounded-lg border border-black/10 px-2 py-1 text-sm outline-none focus:dp-border-brand"
            />
            <input
              value={e.resultado}
              onChange={(ev) => setCampo(e.id, { resultado: ev.target.value })}
              onBlur={(ev) => guardarCampo(e.id, { resultado: ev.target.value })}
              placeholder="Resultado / observación"
              className="flex-1 rounded-lg border border-black/10 px-2 py-1 text-sm outline-none focus:dp-border-brand"
            />
            <button type="button" onClick={() => quitar(e.id)} className="dp-muted hover:dp-alert">
              ✕
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
