"use client";

import { useState } from "react";
import { CUALIDADES, PLIOMETRIA_NSCA, PLIOMETRIA_NOTAS, TABLA_INTENSIDAD } from "@/lib/dipra/tablaIntensidad";

/**
 * Tabla de referencia completa (NSCA + adaptación práctica) — colapsada por
 * default, para consultar qué significa cada cualidad sin tener que
 * recordarlo o salir de la app. Incluye pliometría aparte porque se mide en
 * contactos por sesión, no en sets/reps como el resto.
 */
export function TablaReferenciaNSCA() {
  const [abierta, setAbierta] = useState(false);

  return (
    <div className="mt-3 border-t border-black/5 pt-3">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="dp-text-brand text-xs font-medium hover:underline"
      >
        {abierta ? "− Ocultar tabla de referencia" : "+ Ver tabla de referencia (NSCA)"}
      </button>

      {abierta && (
        <div className="mt-3 flex flex-col gap-4 text-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="dp-muted text-left text-[10px] font-medium tracking-wide uppercase">
                  <th className="pb-1 pr-3">Objetivo</th>
                  <th className="pb-1 pr-3">% 1RM</th>
                  <th className="pb-1 pr-3">Reps</th>
                  <th className="pb-1 pr-3">Series/ejerc.</th>
                  <th className="pb-1 pr-3">Descanso</th>
                  <th className="pb-1">Sets/sem. por grupo (orientativo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {CUALIDADES.map((c) => {
                  const fila = TABLA_INTENSIDAD[c];
                  return (
                    <tr key={c}>
                      <td className="dp-text-heading py-1.5 pr-3 font-medium">{c}</td>
                      <td className="dp-body py-1.5 pr-3 font-mono">{fila.porcentaje1RM}</td>
                      <td className="dp-body py-1.5 pr-3 font-mono">{fila.reps}</td>
                      <td className="dp-body py-1.5 pr-3 font-mono">{fila.seriesPorEjercicio}</td>
                      <td className="dp-body py-1.5 pr-3 font-mono">{fila.descanso}</td>
                      <td className="dp-body py-1.5 font-mono">
                        {fila.setsSemana ? `${fila.setsSemana[0]}-${fila.setsSemana[1]}` : "—"}
                        {fila.notaSetsSemana && <span className="dp-muted"> · {fila.notaSetsSemana}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="dp-muted">
            Para contar series conviene usar conteo fraccional: un ejercicio que trabaja un músculo de forma
            indirecta cuenta como media serie para ese músculo.
          </p>

          <div>
            <p className="dp-text-heading mb-1.5 font-medium">Pliometría (NSCA) — contactos por sesión</p>
            <table className="border-collapse">
              <tbody className="divide-y divide-black/5">
                {PLIOMETRIA_NSCA.map((p) => (
                  <tr key={p.nivel}>
                    <td className="dp-body py-1 pr-4">{p.nivel}</td>
                    <td className="dp-body py-1 font-mono">{p.contactos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="dp-muted mt-1.5 list-disc pl-4">
              {PLIOMETRIA_NOTAS.map((nota) => (
                <li key={nota}>{nota}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
