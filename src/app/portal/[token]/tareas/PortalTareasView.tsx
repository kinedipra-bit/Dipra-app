"use client";

import { useState, useTransition } from "react";
import { ExerciseRow } from "@/app/(app)/clientes/[id]/plan/ExerciseRow";
import { calcVolumenBloque } from "@/lib/dipra/calc";
import type { DiaPlan, EjercicioPlan } from "@/lib/dipra/types";
import { desmarcarTareaHecha, marcarTareaHecha, updateComentarioClienteKine } from "./actions";
import { BloqueFocuseable } from "../BloqueFocuseable";

export function PortalTareasView({
  token,
  dias: diasIniciales,
  indicacionesTexto,
  indicacionesPdfUrl,
  indicacionesPdfNombre,
  diasHechosHoyIniciales,
}: {
  token: string;
  dias: DiaPlan[];
  indicacionesTexto: string;
  indicacionesPdfUrl: string | null;
  indicacionesPdfNombre: string | null;
  diasHechosHoyIniciales: string[];
}) {
  const [dias, setDias] = useState(diasIniciales);
  const [, startTransition] = useTransition();
  const [bloqueActivoId, setBloqueActivoId] = useState<string | null>(null);
  const [hechosHoy, setHechosHoy] = useState<Set<string>>(new Set(diasHechosHoyIniciales));
  const [marcando, startMarcar] = useTransition();

  const toggleHecho = (diaId: string, diaLabel: string) => {
    const yaHecho = hechosHoy.has(diaId);
    setHechosHoy((prev) => {
      const next = new Set(prev);
      if (yaHecho) next.delete(diaId);
      else next.add(diaId);
      return next;
    });
    startMarcar(async () => {
      if (yaHecho) await desmarcarTareaHecha(token, diaId);
      else await marcarTareaHecha(token, diaId, diaLabel);
    });
  };

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
      updateComentarioClienteKine(token, diaId, bloqueId, ejercicioId, comentario);
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="dp-muted -mt-1 text-xs">
        Ejercicios y tareas de kinesiología/rehabilitación — aparte de tu rutina de fuerza.
      </p>

      {(indicacionesTexto || indicacionesPdfUrl) && (
        <section className="dp-scope-dark rounded-2xl p-5 shadow-sm">
          <h2 className="dp-text-brand font-[family-name:var(--font-display)] font-semibold">Indicaciones</h2>
          {indicacionesTexto && <p className="dp-body mt-1 text-sm whitespace-pre-wrap">{indicacionesTexto}</p>}
          {indicacionesPdfUrl && (
            <a
              href={indicacionesPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="dp-text-brand mt-2 inline-block text-sm font-medium underline"
            >
              📄 Ver PDF{indicacionesPdfNombre ? `: ${indicacionesPdfNombre}` : ""}
            </a>
          )}
        </section>
      )}

      {dias.map((dia) => (
        <section key={dia.id} className="dp-scope-dark rounded-2xl p-5 shadow-sm">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="dp-text-brand font-[family-name:var(--font-display)] font-semibold">{dia.label}</h2>
            <button
              type="button"
              onClick={() => toggleHecho(dia.id, dia.label)}
              disabled={marcando}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                hechosHoy.has(dia.id) ? "dp-bg-brand text-white" : "dp-bg-white-10 dp-body"
              }`}
            >
              {hechosHoy.has(dia.id) ? "✓ Hecho hoy" : "Marcar como hecho hoy"}
            </button>
          </div>
          {dia.foco && <p className="dp-muted mb-3 text-sm">{dia.foco}</p>}

          {dia.bloques.map((bloque) => (
            <div key={bloque.id} className="mb-4 last:mb-0">
              <BloqueFocuseable
                title={bloque.title}
                meta={
                  <span className="dp-muted font-mono text-xs">
                    {calcVolumenBloque(bloque).toLocaleString("es-CL")} kg vol.
                  </span>
                }
                estado={bloqueActivoId === null ? "normal" : bloqueActivoId === bloque.id ? "activo" : "atenuado"}
                onFocus={() => setBloqueActivoId((prev) => (prev === bloque.id ? null : bloque.id))}
              >
                {bloque.exercises.length > 0 && (
                  <div
                    className="dp-muted grid gap-2 pb-1 text-[10px] font-medium tracking-wide uppercase"
                    style={{ gridTemplateColumns: "1.3fr 0.5fr 0.8fr 1fr 0.9fr" }}
                  >
                    <span>Ejercicio</span>
                    <span className="text-center">Ser.</span>
                    <span className="text-center">Rep.</span>
                    <span className="text-center">Kg</span>
                    <span className="text-right">Vol.</span>
                  </div>
                )}

                <div className="divide-y divide-white/10">
                  {bloque.exercises.map((ex) => (
                    <div
                      key={ex.id}
                      onBlur={() => guardarComentario(dia.id, bloque.id, ex.id, ex.comentarioCliente)}
                    >
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
              </BloqueFocuseable>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
