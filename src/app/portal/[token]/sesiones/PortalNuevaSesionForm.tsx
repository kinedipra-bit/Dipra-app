"use client";

import { useState, useTransition } from "react";
import { PILARES_KEYS, emptySesionPilares } from "@/lib/dipra/constants";
import { EscalaUnoADiez } from "@/app/(app)/clientes/[id]/sesiones/EscalaUnoADiez";
import { crearSesionPortal } from "./actions";

function pilarInvertido(p: (typeof PILARES_KEYS)[number]): boolean {
  return "invertido" in p && p.invertido === true;
}

export function PortalNuevaSesionForm({ token, diasLabels }: { token: string; diasLabels: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const [diaPlanLabel, setDiaPlanLabel] = useState(diasLabels[0] ?? "");
  const [pilares, setPilares] = useState(emptySesionPilares());
  const [comentarios, setComentarios] = useState("");
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);

  const enviar = () => {
    startTransition(async () => {
      await crearSesionPortal(token, {
        fecha: new Date().toISOString().slice(0, 10),
        dia_plan_label: diaPlanLabel,
        pilares,
        comentarios,
      });
      setPilares(emptySesionPilares());
      setComentarios("");
      setEnviado(true);
      setAbierto(false);
    });
  };

  if (!abierto) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setAbierto(true);
            setEnviado(false);
          }}
          className="dp-bg-brand rounded-xl px-4 py-2 text-sm font-medium text-white"
        >
          + Registrar mi sesión de hoy
        </button>
        {enviado && <span className="dp-muted ml-3 self-center text-xs">¡Sesión registrada!</span>}
      </div>
    );
  }

  return (
    <div className="dp-surface flex flex-col gap-4 rounded-2xl p-5 shadow-sm">
      <h2 className="font-medium dp-text-heading">¿Cómo estuvo tu entrenamiento de hoy?</h2>

      {diasLabels.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">¿Qué día hiciste?</span>
          <select
            value={diaPlanLabel}
            onChange={(e) => setDiaPlanLabel(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
          >
            {diasLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-wrap gap-4">
        {PILARES_KEYS.map((p) => (
          <div key={p.key} className="flex flex-col gap-1">
            <span className="dp-muted text-[10px] font-medium">{p.label}</span>
            <EscalaUnoADiez
              value={pilares[p.key]}
              onChange={(v) => setPilares((prev) => ({ ...prev, [p.key]: v }))}
              invertido={pilarInvertido(p)}
            />
          </div>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="dp-body font-medium">Observaciones (opcional)</span>
        <textarea
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          rows={3}
          placeholder="¿Cómo te sentiste? ¿Algo que quieras contarle a tu profesional?"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={enviar}
          disabled={pending}
          className="dp-bg-brand rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="dp-muted text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}
