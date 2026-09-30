"use client";

import { useState, useTransition } from "react";
import { updateLinkBoletasSii } from "./actions";

export function AjustesForm({ initialLinkBoletasSii }: { initialLinkBoletasSii: string | null }) {
  const [link, setLink] = useState(initialLinkBoletasSii ?? "");
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const guardar = () => {
    startTransition(async () => {
      await updateLinkBoletasSii(link);
      setSavedAt(Date.now());
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <h2 className="mb-1 font-medium dp-text-heading">Boletas (SII)</h2>
      <p className="dp-muted mb-3 text-xs">
        Guardá acá el link a tu portal de boletas del SII — así queda un acceso directo en la ficha de cada
        cliente para emitir la boleta a mano con sus datos a la vista (RUT, nombre).
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="dp-body font-medium">Link del portal de boletas SII</span>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://loboleta.sii.cl/..."
          className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
        />
      </label>
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
