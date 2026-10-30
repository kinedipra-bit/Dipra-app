"use client";

import { useState, useTransition } from "react";
import type { CheckinDiario } from "@/lib/dipra/types";
import { guardarCheckinDiario } from "./actions";

const ESCALA = [0, 1, 2, 3, 4, 5] as const;

function Selector({
  label,
  extremos,
  value,
  onChange,
}: {
  label: string;
  extremos: [string, string];
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="dp-body mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex items-center gap-1.5">
        {ESCALA.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex h-9 w-9 items-center justify-center rounded-full font-mono text-sm font-semibold transition-colors ${
              value === n ? "dp-bg-brand text-white" : "dp-bg-white-10 dp-body hover:dp-bg-white-5"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="dp-muted mt-1 flex justify-between text-[10px]">
        <span>{extremos[0]}</span>
        <span>{extremos[1]}</span>
      </div>
    </div>
  );
}

// "¿Cómo te sentís hoy?" — pulso rápido de dolor/energía, separado de
// marcar tareas como hechas (ver PortalTareasView). Un solo registro por
// día; si ya se respondió hoy, arranca mostrando lo ya guardado en vez del
// formulario vacío.
export function CheckinDiarioCard({
  token,
  checkinInicial,
}: {
  token: string;
  checkinInicial: CheckinDiario | null;
}) {
  const [dolor, setDolor] = useState<number | null>(checkinInicial?.dolor ?? null);
  const [energia, setEnergia] = useState<number | null>(checkinInicial?.energia ?? null);
  const [nota, setNota] = useState(checkinInicial?.nota ?? "");
  const [guardado, setGuardado] = useState(!!checkinInicial);
  const [editando, setEditando] = useState(!checkinInicial);
  const [pending, startTransition] = useTransition();

  const guardar = () => {
    if (dolor === null || energia === null) return;
    startTransition(async () => {
      await guardarCheckinDiario(token, { dolor, energia, nota });
      setGuardado(true);
      setEditando(false);
    });
  };

  if (guardado && !editando) {
    return (
      <section className="dp-scope-dark rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="dp-text-brand font-[family-name:var(--font-display)] font-semibold">
              ✓ Ya registraste cómo te sentís hoy
            </h2>
            <p className="dp-body mt-1 text-sm">
              Dolor {dolor}/5 · Energía {energia}/5
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="dp-text-brand shrink-0 text-xs font-medium hover:underline"
          >
            Corregir
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="dp-scope-dark rounded-2xl p-5 shadow-sm">
      <h2 className="dp-text-brand mb-3 font-[family-name:var(--font-display)] font-semibold">
        ¿Cómo te sentís hoy?
      </h2>
      <div className="flex flex-col gap-4">
        <Selector label="Dolor / molestia" extremos={["Nada", "Mucho"]} value={dolor} onChange={setDolor} />
        <Selector label="Energía" extremos={["Agotado/a", "A full"]} value={energia} onChange={setEnergia} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Algo que quieras contarme (opcional)</span>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej. me molestó la rodilla al subir escaleras"
            className="rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm outline-none"
          />
        </label>
        <button
          type="button"
          onClick={guardar}
          disabled={dolor === null || energia === null || pending}
          className="dp-bg-brand w-fit rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </section>
  );
}
