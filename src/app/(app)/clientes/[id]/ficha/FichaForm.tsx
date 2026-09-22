"use client";

import { useState, useTransition } from "react";
import { updateClienteFicha } from "../../actions";
import { ANTECEDENTES_CAMPOS, PILARES_DESCRIPTIVOS_CAMPOS } from "@/lib/dipra/constants";
import type { Cliente } from "@/lib/dipra/types";

type CampoExtra = { id: string; etiqueta: string; valor: string };

export function FichaForm({ cliente }: { cliente: Cliente }) {
  const [datos, setDatos] = useState({
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    correo: cliente.correo,
    categoria: cliente.categoria,
    ocupacion: cliente.ocupacion,
    objetivo: cliente.objetivo,
  });
  const [pilares, setPilares] = useState(cliente.pilares);
  const [antecedentes, setAntecedentes] = useState(cliente.antecedentes);
  const [camposExtra, setCamposExtra] = useState<CampoExtra[]>(cliente.campos_extra ?? []);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const agregarCampoExtra = () =>
    setCamposExtra((prev) => [...prev, { id: crypto.randomUUID(), etiqueta: "", valor: "" }]);
  const setCampoExtra = (id: string, patch: Partial<CampoExtra>) =>
    setCamposExtra((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const quitarCampoExtra = (id: string) => setCamposExtra((prev) => prev.filter((c) => c.id !== id));

  const guardar = () => {
    startTransition(async () => {
      await updateClienteFicha(cliente.id, {
        ...datos,
        pilares,
        antecedentes,
        campos_extra: camposExtra.filter((c) => c.etiqueta.trim()),
      });
      setSavedAt(Date.now());
    });
  };

  const inputClass = "rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand";

  return (
    <div className="flex flex-col gap-6">
      <section className="dp-surface rounded-2xl p-5 shadow-sm">
        <h2 className="mb-4 font-medium dp-text-heading">Datos personales</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Nombre completo</span>
            <input
              className={inputClass}
              value={datos.nombre}
              onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Categoría</span>
            <input
              className={inputClass}
              value={datos.categoria}
              onChange={(e) => setDatos({ ...datos, categoria: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Teléfono</span>
            <input
              className={inputClass}
              value={datos.telefono}
              onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Correo</span>
            <input
              className={inputClass}
              value={datos.correo}
              onChange={(e) => setDatos({ ...datos, correo: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Ocupación</span>
            <input
              className={inputClass}
              value={datos.ocupacion}
              onChange={(e) => setDatos({ ...datos, ocupacion: e.target.value })}
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Objetivo principal</span>
            <textarea
              rows={2}
              className={inputClass}
              value={datos.objetivo}
              onChange={(e) => setDatos({ ...datos, objetivo: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="dp-surface rounded-2xl p-5 shadow-sm">
        <h2 className="mb-4 font-medium dp-text-heading">Pilares del rendimiento</h2>
        <div className="grid grid-cols-2 gap-4">
          {PILARES_DESCRIPTIVOS_CAMPOS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">{f.label}</span>
              <textarea
                rows={2}
                className={inputClass}
                value={pilares[f.key as keyof typeof pilares] ?? ""}
                onChange={(e) => setPilares({ ...pilares, [f.key]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="dp-surface rounded-2xl p-5 shadow-sm">
        <h2 className="mb-4 font-medium dp-text-heading">Antecedentes clínicos</h2>
        <div className="grid grid-cols-2 gap-4">
          {ANTECEDENTES_CAMPOS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">{f.label}</span>
              <textarea
                rows={2}
                className={inputClass}
                value={antecedentes[f.key] ?? ""}
                onChange={(e) => setAntecedentes({ ...antecedentes, [f.key]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="dp-surface rounded-2xl p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium dp-text-heading">Campos adicionales</h2>
          <button type="button" onClick={agregarCampoExtra} className="dp-text-brand text-xs font-medium hover:underline">
            + Agregar campo
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {camposExtra.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <input
                value={c.etiqueta}
                onChange={(e) => setCampoExtra(c.id, { etiqueta: e.target.value })}
                placeholder="Nombre del dato"
                className={`${inputClass} w-40`}
              />
              <input
                value={c.valor}
                onChange={(e) => setCampoExtra(c.id, { valor: e.target.value })}
                placeholder="Valor"
                className={`${inputClass} flex-1`}
              />
              <button type="button" onClick={() => quitarCampoExtra(c.id)} className="dp-muted hover:dp-alert text-sm">
                ✕
              </button>
            </div>
          ))}
          {camposExtra.length === 0 && <p className="dp-muted text-sm">Sin campos adicionales.</p>}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="dp-bg-brand rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        {savedAt && !pending && <span className="dp-muted text-xs">Guardado.</span>}
      </div>
    </div>
  );
}
