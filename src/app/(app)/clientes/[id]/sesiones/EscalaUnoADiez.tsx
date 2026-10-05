"use client";

import { tonoEscalaPilar } from "@/lib/dipra/calc";

const ESCALA = Array.from({ length: 10 }, (_, i) => i + 1);

export function EscalaUnoADiez({
  value,
  onChange,
  invertido,
  readOnly = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  invertido?: boolean;
  readOnly?: boolean;
}) {
  const numerico = value === "" ? null : Number(value);

  return (
    <div className="flex max-w-full flex-wrap gap-1">
      {ESCALA.map((n) => {
        const activo = numerico === n;
        const tono = tonoEscalaPilar(n, invertido);
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(String(n))}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-medium transition-colors sm:h-7 sm:w-7 sm:text-xs ${
              activo ? `${tono} text-white` : "dp-muted border border-black/10 hover:border-black/20"
            } ${readOnly ? "cursor-default" : ""}`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
