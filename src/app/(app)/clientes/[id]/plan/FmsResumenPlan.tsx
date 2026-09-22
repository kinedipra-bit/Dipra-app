"use client";

import { useState } from "react";
import { calcularFinalesFms, totalFms, type FmsData } from "@/lib/dipra/calc";
import { FMS_SUGERENCIAS, emptyFms } from "@/lib/dipra/constants";

// Migrado desde FmsResumenPlan (dipra-app.jsx líneas 1243-1285). Reusa
// calcularFinalesFms/totalFms de calc.ts tal cual, sin reinterpretar la
// lógica clínica.
export function FmsResumenPlan({ fms }: { fms: FmsData | null | undefined }) {
  const [abierto, setAbierto] = useState(false);
  const datos = fms ?? emptyFms();
  const finales = calcularFinalesFms(datos);
  const total = totalFms(finales);

  const algunaEvaluada = Object.values(finales).some((v) => v !== null && v !== undefined);
  if (!algunaEvaluada) return null;

  const alertas = Object.entries(finales)
    .filter((entry): entry is [string, number] => entry[1] === 0 || entry[1] === 1 || entry[1] === 2)
    .sort((a, b) => a[1] - b[1]);

  return (
    <div className="dp-surface overflow-hidden rounded-2xl shadow-sm">
      <button type="button" onClick={() => setAbierto((v) => !v)} className="flex w-full items-center gap-3 p-4">
        <span className="dp-ink shrink-0 text-sm font-semibold">
          FMS: {total}
          <span className="dp-muted font-normal">/21</span>
        </span>
        {alertas.length > 0 && (
          <span className="dp-muted text-xs">
            {alertas.length} movimiento{alertas.length > 1 ? "s" : ""} con restricción
          </span>
        )}
        <span className={`dp-muted ml-auto inline-block transition-transform ${abierto ? "rotate-90" : ""}`}>
          ›
        </span>
      </button>
      {abierto && (
        <div className="px-4 pb-4">
          {alertas.length === 0 ? (
            <span className="dp-muted text-xs">Sin restricciones marcadas en el screening.</span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {alertas.map(([key, score]) => (
                <span
                  key={key}
                  title={FMS_SUGERENCIAS[key]?.[score as 0 | 1 | 2]}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                    score <= 1 ? "dp-bg-alert" : "dp-bg-amber"
                  }`}
                >
                  {FMS_SUGERENCIAS[key]?.label || key} · {score}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
