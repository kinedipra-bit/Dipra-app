"use client";

import { useState, useTransition } from "react";
import { ExerciseRow } from "@/app/(app)/clientes/[id]/plan/ExerciseRow";
import { SesionesPorDia } from "@/components/SesionesPorDia";
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
        <section key={dia.id} className="dp-surface rounded-2xl p-5 shadow-sm">
          <h2 className="font-medium dp-text-heading">{dia.label}</h2>
          {dia.foco && <p className="dp-muted mb-3 text-sm">{dia.foco}</p>}

          <SesionesPorDia sesiones={sesiones} diaLabel={dia.label} />

          {dia.bloques.map((bloque) => (
            <div key={bloque.id} className="mt-3 first:mt-0">
              <h3 className="dp-muted mb-1 text-xs font-semibold tracking-wide uppercase">{bloque.title}</h3>
              <div className="divide-y divide-black/5">
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
