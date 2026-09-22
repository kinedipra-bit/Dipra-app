"use client";

import { useState, useTransition } from "react";
import { updateDolorAlicia } from "./actions";
import { ALICIA_CAMPOS } from "@/lib/dipra/constants";

// Texto de ayuda por campo — no forma parte de ALICIA_CAMPOS (constants.ts,
// que se usa tal cual), se mantiene acá como copia clínica del prototipo.
const ALICIA_PLACEHOLDERS: Record<(typeof ALICIA_CAMPOS)[number]["key"], string> = {
  antiguedad: "¿Cuándo comenzó el dolor?",
  localizacion: "¿Dónde le duele?",
  irradiacion: "¿Se extiende a otra parte del cuerpo?",
  caracter: "¿Cómo lo describe? (punzante, opresivo, quemante…)",
  intensidad: "Escala 0-10",
  atenuacionAgravacion: "¿Qué lo mejora o lo empeora?",
};

export function DolorAliciaSection({
  clienteId,
  initialDolorAlicia,
}: {
  clienteId: string;
  initialDolorAlicia: Record<string, string>;
}) {
  const [alicia, setAlicia] = useState<Record<string, string>>(initialDolorAlicia);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const setCampo = (key: string, value: string) => setAlicia((prev) => ({ ...prev, [key]: value }));

  const guardar = () => {
    startTransition(async () => {
      await updateDolorAlicia(clienteId, alicia);
      setSavedAt(Date.now());
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 font-medium dp-alert">Evaluación del dolor — ALICIA</h2>
      <p className="dp-muted mb-3 text-xs">
        Antigüedad · Localización · Irradiación · Carácter · Intensidad · Atenuación/Agravación
      </p>
      <div className="grid grid-cols-2 gap-3">
        {ALICIA_CAMPOS.map((c) => (
          <label key={c.key} className="flex flex-col gap-1 text-xs">
            <span className="dp-body font-medium">{c.label}</span>
            <input
              value={alicia[c.key] || ""}
              onChange={(e) => setCampo(c.key, e.target.value)}
              placeholder={ALICIA_PLACEHOLDERS[c.key]}
              className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
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
