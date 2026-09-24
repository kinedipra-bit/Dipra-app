"use client";

import { useState, useTransition } from "react";
import { ExerciseRow } from "@/app/(app)/clientes/[id]/plan/ExerciseRow";
import { SesionesPorDia } from "@/components/SesionesPorDia";
import { calcVolumenBloque } from "@/lib/dipra/calc";
import type { PlanSemana, EjercicioPlan, Sesion } from "@/lib/dipra/types";
import { updateComentarioCliente } from "./actions";

export function PortalPlanView({
  token,
  semana,
  sesiones,
}: {
  token: string;
  semana: PlanSemana;
  sesiones: Sesion[];
}) {
  const [dias, setDias] = useState(semana.dias);
  const [, startTransition] = useTransition();

  const setEjercicio = (diaId: string, bloqueId: string, next: EjercicioPlan) => {
    setDias((prev) =>
      prev.map((d) =>
        d.id !== diaId
          ? d
          : {
              ...d,
              bloques: d.bloques.map((b) =>
                b.id !== bloqueId
                  ? b
                  : { ...b, exercises: b.exercises.map((e) => (e.id === next.id ? next : e)) }
              ),
            }
      )
    );
  };

  const guardarComentario = (diaId: string, bloqueId: string, ejercicioId: string, comentario: string) => {
    startTransition(() => {
      updateComentarioCliente(token, semana.id, diaId, bloqueId, ejercicioId, comentario);
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="dp-muted -mt-1 text-xs">
        {semana.mesociclo || `Semana ${semana.numero}`} {semana.objetivo && `— ${semana.objetivo}`}
      </p>

      {dias.map((dia) => (
        <section key={dia.id} className="dp-scope-dark rounded-2xl p-5 shadow-sm">
          <h2 className="dp-text-brand font-[family-name:var(--font-display)] font-semibold">{dia.label}</h2>
          {dia.foco && <p className="dp-muted mb-3 text-sm">{dia.foco}</p>}

          <SesionesPorDia sesiones={sesiones} diaLabel={dia.label} />

          {dia.bloques.map((bloque) => (
            <div key={bloque.id} className="mt-3 first:mt-0">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="dp-muted text-xs font-semibold tracking-wide uppercase">{bloque.title}</h3>
                <span className="dp-muted font-mono text-xs">
                  {calcVolumenBloque(bloque).toLocaleString("es-CL")} kg vol.
                </span>
              </div>

              {bloque.exercises.length > 0 && (
                <div
                  className="dp-muted grid gap-2 pb-1 text-[10px] font-medium tracking-wide uppercase"
                  style={{ gridTemplateColumns: "1.5fr 0.5fr 0.75fr 0.6fr 0.7fr auto" }}
                >
                  <span>Ejercicio</span>
                  <span className="text-center">Ser.</span>
                  <span className="text-center">Rep.</span>
                  <span className="text-center">Kg</span>
                  <span className="text-right">Vol.</span>
                  <span />
                </div>
              )}

              <div className="divide-y divide-white/10">
                {bloque.exercises.map((ex) => (
                  <div key={ex.id} onBlur={() => guardarComentario(dia.id, bloque.id, ex.id, ex.comentarioCliente)}>
                    <ExerciseRow
                      ex={ex}
                      onChange={(next) => setEjercicio(dia.id, bloque.id, next)}
                      onRemove={() => {}}
                      readOnly
                      allowClientComment
                    />
                  </div>
                ))}
                {bloque.exercises.length === 0 && <p className="dp-muted py-1 text-xs">Sin ejercicios.</p>}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
