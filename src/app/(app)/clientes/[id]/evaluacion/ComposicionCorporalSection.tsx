"use client";

import { useState, useTransition } from "react";
import { agregarComposicion, eliminarComposicion } from "./actions";
import { imc } from "@/lib/dipra/calc";
import type { ComposicionCorporalEntry } from "@/lib/dipra/types";

type Draft = {
  fecha: string;
  talla: string;
  peso: string;
  grasaPct: string;
  masaMuscular: string;
  aguaPct: string;
  masaOsea: string;
};

function draftVacio(): Draft {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    talla: "",
    peso: "",
    grasaPct: "",
    masaMuscular: "",
    aguaPct: "",
    masaOsea: "",
  };
}

const numOrNull = (v: string) => (v === "" ? null : Number(v));

export function ComposicionCorporalSection({
  clienteId,
  initialItems,
}: {
  clienteId: string;
  initialItems: ComposicionCorporalEntry[];
}) {
  const [items, setItems] = useState<ComposicionCorporalEntry[]>(
    [...initialItems].sort((a, b) => b.fecha.localeCompare(a.fecha))
  );
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(draftVacio());
  const [pending, startTransition] = useTransition();

  const inputClass =
    "mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 text-sm outline-none focus:dp-border-brand";

  const agregar = () => {
    if (!draft.talla && !draft.peso) return;
    startTransition(async () => {
      const nueva = await agregarComposicion(clienteId, {
        fecha: draft.fecha,
        talla: numOrNull(draft.talla),
        peso: numOrNull(draft.peso),
        grasa_pct: numOrNull(draft.grasaPct),
        masa_muscular: numOrNull(draft.masaMuscular),
        agua_pct: numOrNull(draft.aguaPct),
        masa_osea: numOrNull(draft.masaOsea),
      });
      setItems((prev) => [nueva, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha)));
      setDraft(draftVacio());
      setShowAdd(false);
    });
  };

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar esta medición?")) return;
    startTransition(async () => {
      await eliminarComposicion(clienteId, id);
      setItems((prev) => prev.filter((c) => c.id !== id));
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-medium dp-text-heading">Composición corporal</h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="dp-text-brand text-xs font-medium hover:underline"
        >
          + Agregar medición
        </button>
      </div>
      <p className="dp-muted mb-3 text-xs">
        Talla, peso e IMC siempre; % grasa, masa muscular, % agua y masa ósea si tienes los datos (ej.
        balanza Body Pro).
      </p>

      {showAdd && (
        <div className="dp-bg-faint mb-3 grid grid-cols-4 gap-2 rounded-xl p-3">
          <div>
            <label className="dp-body text-[11px] font-medium">Fecha</label>
            <input
              type="date"
              value={draft.fecha}
              onChange={(e) => setDraft({ ...draft, fecha: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="dp-body text-[11px] font-medium">Talla (cm)</label>
            <input
              type="number"
              value={draft.talla}
              onChange={(e) => setDraft({ ...draft, talla: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="dp-body text-[11px] font-medium">Peso (kg)</label>
            <input
              type="number"
              value={draft.peso}
              onChange={(e) => setDraft({ ...draft, peso: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="dp-body text-[11px] font-medium">% Grasa</label>
            <input
              type="number"
              value={draft.grasaPct}
              onChange={(e) => setDraft({ ...draft, grasaPct: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="dp-body text-[11px] font-medium">Masa muscular (kg)</label>
            <input
              type="number"
              value={draft.masaMuscular}
              onChange={(e) => setDraft({ ...draft, masaMuscular: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="dp-body text-[11px] font-medium">% Agua</label>
            <input
              type="number"
              value={draft.aguaPct}
              onChange={(e) => setDraft({ ...draft, aguaPct: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="dp-body text-[11px] font-medium">Masa ósea (kg)</label>
            <input
              type="number"
              value={draft.masaOsea}
              onChange={(e) => setDraft({ ...draft, masaOsea: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={agregar}
              disabled={pending}
              className="dp-bg-brand w-full rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="dp-muted py-3 text-center text-sm">Sin mediciones registradas todavía.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="dp-muted text-left text-[10px] font-medium uppercase tracking-wide">
                <th className="pb-1 pr-3">Fecha</th>
                <th className="pb-1 pr-3">Talla</th>
                <th className="pb-1 pr-3">Peso</th>
                <th className="pb-1 pr-3">IMC</th>
                <th className="pb-1 pr-3">% Grasa</th>
                <th className="pb-1 pr-3">M. muscular</th>
                <th className="pb-1 pr-3">% Agua</th>
                <th className="pb-1 pr-3">M. ósea</th>
                <th className="pb-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {items.map((c) => (
                <tr key={c.id} className="font-mono text-xs dp-text-heading">
                  <td className="py-1.5 pr-3">{c.fecha}</td>
                  <td className="py-1.5 pr-3">{c.talla ?? "—"} cm</td>
                  <td className="py-1.5 pr-3">{c.peso ?? "—"} kg</td>
                  <td className="py-1.5 pr-3">{c.talla && c.peso ? imc(c.talla, c.peso) : "—"}</td>
                  <td className="py-1.5 pr-3">{c.grasa_pct !== null ? `${c.grasa_pct}%` : "—"}</td>
                  <td className="py-1.5 pr-3">{c.masa_muscular ?? "—"}</td>
                  <td className="py-1.5 pr-3">{c.agua_pct !== null ? `${c.agua_pct}%` : "—"}</td>
                  <td className="py-1.5 pr-3">{c.masa_osea ?? "—"}</td>
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() => eliminar(c.id)}
                      className="dp-muted hover:dp-alert text-xs"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
