"use client";

import { useState, useTransition } from "react";
import { updateDiagnosticoKinesico } from "./actions";

export function DiagnosticoKinesicoSection({
  clienteId,
  initialDiagnostico,
}: {
  clienteId: string;
  initialDiagnostico: string;
}) {
  const [diagnostico, setDiagnostico] = useState(initialDiagnostico);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const guardar = () => {
    startTransition(async () => {
      await updateDiagnosticoKinesico(clienteId, diagnostico);
      setSavedAt(Date.now());
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <h2 className="mb-1 font-medium dp-text-heading">Diagnóstico kinésico</h2>
      <p className="dp-muted mb-3 text-xs">
        Opcional — completalo cuando el caso es una rehabilitación. Diagnóstico, fase del proceso, pronóstico,
        lo que corresponda.
      </p>
      <textarea
        value={diagnostico}
        onChange={(e) => setDiagnostico(e.target.value)}
        rows={4}
        placeholder="Ej. Tendinopatía rotuliana derecha, fase subaguda, en progresión de carga…"
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
