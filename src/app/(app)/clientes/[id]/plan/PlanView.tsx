"use client";

import { useState, useTransition } from "react";
import { calcVolumenBloque } from "@/lib/dipra/calc";
import type { FmsData } from "@/lib/dipra/calc";
import { nuevosDias } from "@/lib/dipra/constants";
import type { PlanSemana, DiaPlan, EjercicioPlan, EjercicioBiblioteca } from "@/lib/dipra/types";
import { crearSemana, guardarSemana, setSemanaActiva as marcarSemanaActiva, guardarEnBiblioteca } from "./actions";
import { ExerciseRow } from "./ExerciseRow";
import { ResumenDia } from "./ResumenDia";
import { BarraDeCarga } from "./BarraDeCarga";
import { FmsResumenPlan } from "./FmsResumenPlan";

type Vista = "editar" | "resumen-dia" | "resumen-semana";

function nuevoEjercicio(): EjercicioPlan {
  return {
    id: crypto.randomUUID(),
    nombre: "",
    series: 3,
    reps: 10,
    kg: 0,
    link: "",
    rpe: "",
    rir: "",
    tut: "",
    descanso: "",
    comentarioCliente: "",
  };
}

/**
 * Pestaña "Plan" del detalle de cliente. Migrado desde PlanTab
 * (dipra-app.jsx líneas 1287-1516).
 *
 * Decisión de persistencia: a diferencia del prototipo (que mutaba el
 * estado local en cada cambio y dejaba la persistencia a otro mecanismo),
 * acá se sigue el patrón ya establecido en FichaForm: los cambios de
 * contenido (mesociclo/objetivo/foco/bloques/ejercicios) se acumulan en
 * estado local y se persisten enteros con "Guardar cambios" — evita
 * disparar un update de todo el jsonb `dias` en cada tecla. Las acciones
 * estructurales (crear semana, cambiar la semana activa) sí se persisten
 * al toque, porque son navegación/alta, no edición de contenido.
 */
export function PlanView({
  clienteId,
  fms,
  semanaActivaId: semanaActivaIdInicial,
  semanasIniciales,
  bibliotecaInicial,
}: {
  clienteId: string;
  fms: FmsData | null | undefined;
  semanaActivaId: string | null;
  semanasIniciales: PlanSemana[];
  bibliotecaInicial: EjercicioBiblioteca[];
}) {
  const [semanas, setSemanas] = useState<PlanSemana[]>(semanasIniciales);
  const [semanaActivaId, setSemanaActivaId] = useState<string | null>(
    semanaActivaIdInicial ?? semanasIniciales[0]?.id ?? null
  );
  const [diaIdx, setDiaIdx] = useState(0);
  const [vista, setVista] = useState<Vista>("editar");
  const [biblioteca, setBiblioteca] = useState<EjercicioBiblioteca[]>(bibliotecaInicial);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [creando, startCrear] = useTransition();
  const [guardando, startGuardar] = useTransition();

  const semanaIdx = Math.max(
    0,
    semanas.findIndex((s) => s.id === semanaActivaId)
  );
  const semana = semanas[semanaIdx];
  const dia = semana?.dias[diaIdx];

  const updateSemana = (next: PlanSemana) => {
    setSemanas((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  };
  const updateDia = (nextDia: DiaPlan) => {
    if (!semana) return;
    const nextDias = semana.dias.map((d, i) => (i === diaIdx ? nextDia : d));
    updateSemana({ ...semana, dias: nextDias });
  };

  // Clona la semana activa como punto de partida (mismo comportamiento que
  // agregarSemana en el prototipo: solo se regeneran los ids de los días,
  // bloques y ejercicios se clonan tal cual). Si todavía no hay ninguna
  // semana, arranca desde la plantilla en blanco de nuevosDias().
  const crearNuevaSemana = () => {
    const id = crypto.randomUUID();
    const numero = semanas.length + 1;
    const mesociclo = semana?.mesociclo ?? "";
    const objetivo = semana?.objetivo ?? "";
    const dias: DiaPlan[] = semana
      ? structuredClone(semana.dias).map((d: DiaPlan) => ({ ...d, id: crypto.randomUUID() }))
      : nuevosDias();

    startCrear(async () => {
      const creada = await crearSemana(clienteId, { id, numero, mesociclo, objetivo, dias });
      setSemanas((prev) => [...prev, creada]);
      setSemanaActivaId(creada.id);
      setDiaIdx(0);
      setVista("editar");
    });
  };

  const seleccionarSemana = (id: string) => {
    setSemanaActivaId(id);
    setDiaIdx(0);
    void marcarSemanaActiva(clienteId, id);
  };

  const guardarCambios = () => {
    if (!semana) return;
    startGuardar(async () => {
      await guardarSemana(clienteId, semana.id, {
        mesociclo: semana.mesociclo,
        objetivo: semana.objetivo,
        dias: semana.dias,
      });
      setSavedAt(Date.now());
    });
  };

  const guardarEjercicioEnBiblioteca = async (ex: { nombre: string; link: string }) => {
    const creado = await guardarEnBiblioteca(ex.nombre, ex.link);
    setBiblioteca((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  };

  const addExercise = (bIdx: number) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques[bIdx].exercises.push(nuevoEjercicio());
    updateDia(nextDia);
  };
  const changeExercise = (bIdx: number, eIdx: number, nextEx: EjercicioPlan) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques[bIdx].exercises[eIdx] = nextEx;
    updateDia(nextDia);
  };
  const removeExercise = (bIdx: number, eIdx: number) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques[bIdx].exercises.splice(eIdx, 1);
    updateDia(nextDia);
  };
  const addBloque = () => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques.push({ id: crypto.randomUUID(), title: "Nuevo bloque", exercises: [] });
    updateDia(nextDia);
  };
  const insertBloqueAfter = (bIdx: number) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques.splice(bIdx + 1, 0, { id: crypto.randomUUID(), title: "Nuevo bloque", exercises: [] });
    updateDia(nextDia);
  };
  const renameBloque = (bIdx: number, title: string) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques[bIdx].title = title;
    updateDia(nextDia);
  };
  const removeBloque = (bIdx: number) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques.splice(bIdx, 1);
    updateDia(nextDia);
  };

  if (!semana) {
    return (
      <div className="flex flex-col gap-5">
        <FmsResumenPlan fms={fms} />
        <div className="dp-surface flex flex-col items-center gap-3 rounded-2xl p-10 text-center shadow-sm">
          <p className="dp-body text-sm">Este cliente todavía no tiene ninguna semana de plan cargada.</p>
          <button
            type="button"
            onClick={crearNuevaSemana}
            disabled={creando}
            className="dp-bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {creando ? "Creando…" : "Crear primera semana"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <FmsResumenPlan fms={fms} />

      <datalist id="biblioteca-datalist">
        {biblioteca.map((b) => (
          <option key={b.id} value={b.nombre} />
        ))}
      </datalist>

      <div className="dp-surface rounded-2xl p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {semanas.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => seleccionarSemana(s.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                s.id === semana.id ? "dp-bg-brand text-white" : "dp-bg-faint dp-body"
              }`}
            >
              Semana {s.numero}
            </button>
          ))}
          <button
            type="button"
            onClick={crearNuevaSemana}
            disabled={creando}
            className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium disabled:opacity-50"
          >
            + {creando ? "Creando…" : "Nueva semana"}
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <input
            value={semana.mesociclo || ""}
            onChange={(e) => updateSemana({ ...semana, mesociclo: e.target.value })}
            placeholder="Mesociclo (ej. Mesociclo 5)"
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
          />
          <input
            value={semana.objetivo || ""}
            onChange={(e) => updateSemana({ ...semana, objetivo: e.target.value })}
            placeholder="Objetivo de la fase (ej. Fuerza máxima)"
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
          />
        </div>

        <h3 className="dp-ink mb-1 font-semibold">Carga semanal</h3>
        <BarraDeCarga dias={semana.dias} />
      </div>

      <div className="flex items-center gap-1.5">
        {(
          [
            { id: "editar", label: "Editar" },
            { id: "resumen-dia", label: "Resumen del día" },
            { id: "resumen-semana", label: "Resumen de la semana" },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVista(v.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              vista === v.id ? "dp-bg-brand text-white" : "dp-bg-faint dp-body"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {vista === "resumen-semana" ? (
        <div className="flex flex-col gap-4">
          {semana.dias.map((d) => (
            <ResumenDia key={d.id} dia={d} />
          ))}
        </div>
      ) : vista === "resumen-dia" ? (
        <>
          <div className="flex gap-1.5">
            {semana.dias.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDiaIdx(i)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  i === diaIdx ? "dp-bg-ink text-white" : "dp-bg-faint dp-body"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {dia && <ResumenDia dia={dia} />}
        </>
      ) : (
        <>
          <div className="flex gap-1.5">
            {semana.dias.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDiaIdx(i)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  i === diaIdx ? "dp-bg-ink text-white" : "dp-bg-faint dp-body"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {dia && (
            <div className="dp-surface rounded-2xl p-5 shadow-sm">
              <input
                value={dia.foco}
                onChange={(e) => updateDia({ ...dia, foco: e.target.value })}
                placeholder="Foco del día (ej. Empuje superior / Tracción inferior)"
                className="mb-4 w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
              />

              <div className="flex flex-col gap-5">
                {dia.bloques.map((b, bIdx) => {
                  const vol = calcVolumenBloque(b);
                  return (
                    <div key={b.id}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <input
                          value={b.title}
                          onChange={(e) => renameBloque(bIdx, e.target.value)}
                          className="dp-ink border-none bg-transparent text-sm font-semibold tracking-wide uppercase outline-none focus:underline"
                          style={{ minWidth: 120 }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="dp-muted font-mono text-xs">{vol.toLocaleString("es-CL")} kg vol.</span>
                          <button
                            type="button"
                            onClick={() => removeBloque(bIdx)}
                            title="Eliminar bloque"
                            className="dp-muted hover:dp-alert text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {b.exercises.length > 0 && (
                        <div
                          className="dp-muted grid gap-2 pb-1 text-[10px] font-medium tracking-wide uppercase"
                          style={{ gridTemplateColumns: "1.6fr 0.55fr 0.55fr 0.6fr 0.7fr auto" }}
                        >
                          <span>Ejercicio</span>
                          <span className="text-center">Ser.</span>
                          <span className="text-center">Rep.</span>
                          <span className="text-center">Kg</span>
                          <span className="text-right">Vol.</span>
                          <span />
                        </div>
                      )}

                      <div className="divide-y divide-black/5">
                        {b.exercises.map((ex, eIdx) => (
                          <ExerciseRow
                            key={ex.id}
                            ex={ex}
                            onChange={(next) => changeExercise(bIdx, eIdx, next)}
                            onRemove={() => removeExercise(bIdx, eIdx)}
                            biblioteca={biblioteca}
                            onSaveToBiblioteca={guardarEjercicioEnBiblioteca}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => addExercise(bIdx)}
                        className="dp-text-brand mt-2 flex items-center gap-1 text-xs font-medium hover:underline"
                      >
                        + Agregar ejercicio
                      </button>

                      <button
                        type="button"
                        onClick={() => insertBloqueAfter(bIdx)}
                        className="dp-muted hover:dp-text-brand mt-3 flex w-full items-center justify-center gap-1 border-t border-dashed border-black/10 py-1 text-[11px] font-medium"
                      >
                        + Insertar bloque aquí
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addBloque}
                className="dp-text-brand mt-5 flex items-center gap-1.5 text-sm font-medium hover:underline"
              >
                + Agregar bloque
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={guardarCambios}
              disabled={guardando}
              className="dp-bg-brand rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
            {savedAt && !guardando && <span className="dp-muted text-xs">Guardado.</span>}
          </div>
        </>
      )}
    </div>
  );
}
