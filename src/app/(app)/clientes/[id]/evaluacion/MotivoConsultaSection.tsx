"use client";

import { useState, useTransition } from "react";
import { updateMotivoConsulta } from "./actions";

export function MotivoConsultaSection({
  clienteId,
  initialMotivoConsulta,
}: {
  clienteId: string;
  initialMotivoConsulta: string;
}) {
  const [motivo, setMotivo] = useState(initialMotivoConsulta);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const guardar = () => {
    startTransition(async () => {
      await updateMotivoConsulta(clienteId, motivo);
      setSavedAt(Date.now());
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <h2 className="mb-1 font-medium dp-text-heading">Objetivo / Motivo de consulta / Anamnesis</h2>
      <p className="dp-muted mb-3 text-xs">Por qué llega la persona, qué espera lograr, antecedentes relevantes de entrada.</p>
      <textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={4}
        placeholder="Ej. Dolor lumbar de 3 meses tras volver a entrenar, busca volver a correr sin molestias…"
        className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
      />
      <div className="mt-3 flex items-center gap-3">
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
    </section>
  );
}
