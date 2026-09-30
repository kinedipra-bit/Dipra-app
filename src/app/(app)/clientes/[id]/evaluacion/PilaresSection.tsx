"use client";

import { useState, useTransition } from "react";
import { updatePilaresDescriptivos } from "./actions";
import { PILARES_DESCRIPTIVOS_CAMPOS } from "@/lib/dipra/constants";
import type { Cliente } from "@/lib/dipra/types";

// Mismos datos que "Pilares del rendimiento" en Ficha (clients.pilares) —
// se edita acá también porque en una evaluación clínica tiene más sentido
// verlo junto al resto (FMS, dolor, movilidad) que en los datos personales.
export function PilaresSection({
  clienteId,
  initialPilares,
}: {
  clienteId: string;
  initialPilares: Cliente["pilares"];
}) {
  const [pilares, setPilares] = useState(initialPilares);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const guardar = () => {
    startTransition(async () => {
      await updatePilaresDescriptivos(clienteId, pilares);
      setSavedAt(Date.now());
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <h2 className="mb-1 font-medium dp-text-heading">Pilares del rendimiento</h2>
      <p className="dp-muted mb-3 text-xs">Cómo está la persona hoy en cada pilar — se ve/edita igual desde Ficha.</p>
      <div className="grid grid-cols-2 gap-4">
        {PILARES_DESCRIPTIVOS_CAMPOS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">{f.label}</span>
            <textarea
              rows={2}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
              value={pilares[f.key as keyof typeof pilares] ?? ""}
              onChange={(e) => setPilares({ ...pilares, [f.key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
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
