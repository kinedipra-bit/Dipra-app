"use client";

import { useState, useTransition } from "react";
import { calcVolumenBloque } from "@/lib/dipra/calc";
import { blockTemplate, nuevosDias } from "@/lib/dipra/constants";
import type {
  GrupoPlanSemana,
  DiaPlan,
  BloquePlan,
  EjercicioPlan,
  EjercicioBiblioteca,
  CualidadFuerza,
  GrupoMuscular,
} from "@/lib/dipra/types";
import { crearSemanaGrupo, guardarSemanaGrupo, setSemanaActivaGrupo } from "../actions";
import { guardarEnBiblioteca } from "@/app/(app)/clientes/[id]/plan/actions";
import { ExerciseRow, EXERCISE_ROW_GRID_EDITABLE } from "@/app/(app)/clientes/[id]/plan/ExerciseRow";
import { ResumenDia } from "@/app/(app)/clientes/[id]/plan/ResumenDia";
import { BarraDeCarga } from "@/app/(app)/clientes/[id]/plan/BarraDeCarga";
import {
  CUALIDADES,
  GRUPOS_MUSCULARES,
  TABLA_INTENSIDAD,
  aplicarDescansoSugerido,
  descansoDisponible,
} from "@/lib/dipra/tablaIntensidad";

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

function clonarBloques(bloques: BloquePlan[]): BloquePlan[] {
  return bloques.map((b) => ({
    ...b,
    id: crypto.randomUUID(),
    exercises: b.exercises.map((e) => ({ ...e, id: crypto.randomUUID() })),
  }));
}

// Planificación de un grupo — mismo editor que el plan de fuerza individual
// (PlanView), pero sin compartir rutina (no hay portal grupal), sin
// biblioteca de plantillas ni cruce con sesiones/citas/FMS individuales.
export function GrupoPlanView({
  grupoId,
  semanaActivaId: semanaActivaIdInicial,
  semanasIniciales,
  bibliotecaInicial,
}: {
  grupoId: string;
  semanaActivaId: string | null;
  semanasIniciales: GrupoPlanSemana[];
  bibliotecaInicial: EjercicioBiblioteca[];
}) {
  const [semanas, setSemanas] = useState<GrupoPlanSemana[]>(semanasIniciales);
  const [semanaActivaId, setSemanaActivaId] = useState<string | null>(
    semanaActivaIdInicial ?? semanasIniciales[0]?.id ?? null
  );
  const [diaIdx, setDiaIdx] = useState(0);
  const [diaFuenteCopiaId, setDiaFuenteCopiaId] = useState("");
  const [vista, setVista] = useState<Vista>("editar");
  const [biblioteca, setBiblioteca] = useState<EjercicioBiblioteca[]>(bibliotecaInicial);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [creando, startCrear] = useTransition();
  const [guardando, startGuardar] = useTransition();

  const semanaIdx = Math.max(0, semanas.findIndex((s) => s.id === semanaActivaId));
  const semana = semanas[semanaIdx];
  const dia = semana?.dias[diaIdx];

  const updateSemana = (next: GrupoPlanSemana) => {
    setSemanas((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  };
  const updateDia = (nextDia: DiaPlan) => {
    if (!semana) return;
    const nextDias = semana.dias.map((d, i) => (i === diaIdx ? nextDia : d));
    updateSemana({ ...semana, dias: nextDias });
  };

  const crearNuevaSemana = () => {
    const id = crypto.randomUUID();
    const numero = semanas.length + 1;
    const mesociclo = semana?.mesociclo ?? "";
    const objetivo = semana?.objetivo ?? "";
    const dias: DiaPlan[] = semana
      ? structuredClone(semana.dias).map((d: DiaPlan) => ({ ...d, id: crypto.randomUUID() }))
      : nuevosDias();

    startCrear(async () => {
      const creada = await crearSemanaGrupo(grupoId, { id, numero, mesociclo, objetivo, dias });
      setSemanas((prev) => [...prev, creada]);
      setSemanaActivaId(creada.id);
      setDiaIdx(0);
      setVista("editar");
    });
  };

  const seleccionarSemana = (id: string) => {
    setSemanaActivaId(id);
    setDiaIdx(0);
    void setSemanaActivaGrupo(grupoId, id);
  };

  const guardarCambios = () => {
    if (!semana) return;
    startGuardar(async () => {
      await guardarSemanaGrupo(grupoId, semana.id, {
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
  const setBloqueCualidad = (bIdx: number, cualidad: CualidadFuerza | "") => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques[bIdx].cualidad = cualidad || undefined;
    updateDia(nextDia);
  };
  const setBloqueGrupoMuscular = (bIdx: number, grupoMuscular: GrupoMuscular | "") => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques[bIdx].grupoMuscular = grupoMuscular || undefined;
    updateDia(nextDia);
  };
  const aplicarDescanso = (bIdx: number) => {
    if (!dia) return;
    const nextDia = structuredClone(dia);
    nextDia.bloques[bIdx] = aplicarDescansoSugerido(nextDia.bloques[bIdx]);
    updateDia(nextDia);
  };

  const addDia = () => {
    if (!semana) return;
    const nextDias: DiaPlan[] = [
      ...semana.dias,
      { id: crypto.randomUUID(), label: `Día ${semana.dias.length + 1}`, foco: "", bloques: blockTemplate() },
    ];
    updateSemana({ ...semana, dias: nextDias });
    setDiaIdx(nextDias.length - 1);
  };
  const removeDia = (idx: number) => {
    if (!semana || semana.dias.length <= 1) return;
    const target = semana.dias[idx];
    if (!window.confirm(`¿Eliminar "${target.label}"? Se van a perder todos sus bloques y ejercicios.`)) return;
    const nextDias = semana.dias.filter((_, i) => i !== idx);
    updateSemana({ ...semana, dias: nextDias });
    setDiaIdx((prev) => Math.min(prev, nextDias.length - 1));
  };
  const renameDia = (idx: number, label: string) => {
    if (!semana) return;
    const nextDias = semana.dias.map((d, i) => (i === idx ? { ...d, label } : d));
    updateSemana({ ...semana, dias: nextDias });
  };

  const copiarDiaDentroDeSemana = () => {
    if (!dia || !semana) return;
    const fuente = semana.dias.find((d) => d.id === diaFuenteCopiaId);
    if (!fuente) return;
    const teniaContenido = dia.bloques.some((b) => b.exercises.length > 0);
    if (teniaContenido && !window.confirm(`¿Reemplazar los bloques de "${dia.label}" por los de "${fuente.label}"?`)) {
      return;
    }
    updateDia({ ...dia, bloques: clonarBloques(fuente.bloques) });
    setDiaFuenteCopiaId("");
  };

  if (!semana) {
    return (
      <div className="dp-surface flex flex-col items-center gap-3 rounded-2xl p-10 text-center shadow-sm">
        <p className="dp-body text-sm">Este grupo todavía no tiene ninguna semana de plan cargada.</p>
        <button
          type="button"
          onClick={crearNuevaSemana}
          disabled={creando}
          className="dp-bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {creando ? "Creando…" : "Crear primera semana"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <datalist id="biblioteca-datalist-grupo">
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
              title={`Semana ${s.numero}`}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                s.id === semana.id ? "dp-bg-brand text-white" : "dp-bg-faint dp-body"
              }`}
            >
              {s.mesociclo || `Semana ${s.numero}`}
              {s.objetivo && ` · ${s.objetivo}`}
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
        <div className="flex gap-4 overflow-x-auto pb-2">
          {semana.dias.map((d) => (
            <div key={d.id} className="w-72 shrink-0">
              <ResumenDia dia={d} />
            </div>
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
          <div className="flex flex-wrap items-center gap-1.5">
            {semana.dias.map((d, i) => (
              <div
                key={d.id}
                className={`flex items-center gap-0.5 rounded-lg ${i === diaIdx ? "dp-bg-ink" : "dp-bg-faint"}`}
              >
                <button
                  type="button"
                  onClick={() => setDiaIdx(i)}
                  className={`rounded-lg py-1.5 pl-3 text-sm font-medium transition-colors ${
                    i === diaIdx ? "text-white" : "dp-body"
                  } ${semana.dias.length > 1 ? "pr-1" : "pr-3"}`}
                >
                  {d.label}
                </button>
                {semana.dias.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDia(i)}
                    title="Eliminar día"
                    className={`pr-2 text-xs ${i === diaIdx ? "text-white/70 hover:text-white" : "dp-muted hover:dp-alert"}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addDia}
              className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium"
            >
              + Agregar día
            </button>
            {semana.dias.length > 1 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={diaFuenteCopiaId}
                  onChange={(e) => setDiaFuenteCopiaId(e.target.value)}
                  className="rounded-lg border border-black/10 px-1.5 py-1 text-xs outline-none focus:dp-border-brand"
                >
                  <option value="">Copiar día…</option>
                  {semana.dias
                    .filter((d) => d.id !== dia?.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={copiarDiaDentroDeSemana}
                  disabled={!diaFuenteCopiaId}
                  title={`Reemplaza los bloques de ${dia?.label ?? "este día"} por los del día elegido`}
                  className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium disabled:opacity-40"
                >
                  Copiar a {dia?.label}
                </button>
              </div>
            )}
          </div>

          {dia && (
            <div className="dp-surface rounded-2xl p-5 shadow-sm">
              <input
                value={dia.label}
                onChange={(e) => renameDia(diaIdx, e.target.value)}
                placeholder="Nombre del día (ej. Día 1)"
                className="dp-ink mb-2 w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold outline-none focus:dp-border-brand"
              />
              <input
                value={dia.foco}
                onChange={(e) => updateDia({ ...dia, foco: e.target.value })}
                placeholder="Foco del día (ej. Empuje superior / Tracción inferior)"
                className="mb-4 w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
              />

              <div className="flex flex-col gap-3">
                {dia.bloques.map((b, bIdx) => {
                  const vol = calcVolumenBloque(b);
                  return (
                    <div key={b.id}>
                      <div className="dp-bg-faint dp-border-brand rounded-xl border-l-4 p-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <input
                            value={b.title}
                            onChange={(e) => renameBloque(bIdx, e.target.value)}
                            className="dp-ink border-none bg-transparent text-lg font-semibold tracking-wide uppercase outline-none focus:underline"
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

                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <select
                            value={b.grupoMuscular ?? ""}
                            onChange={(e) => setBloqueGrupoMuscular(bIdx, e.target.value as GrupoMuscular | "")}
                            className="dp-body rounded-md border border-black/10 bg-white px-1.5 py-0.5 text-[11px] outline-none focus:dp-border-brand"
                          >
                            <option value="">Grupo muscular…</option>
                            {GRUPOS_MUSCULARES.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                          <select
                            value={b.cualidad ?? ""}
                            onChange={(e) => setBloqueCualidad(bIdx, e.target.value as CualidadFuerza | "")}
                            className="dp-body rounded-md border border-black/10 bg-white px-1.5 py-0.5 text-[11px] outline-none focus:dp-border-brand"
                          >
                            <option value="">Cualidad de fuerza…</option>
                            {CUALIDADES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          {b.cualidad &&
                            TABLA_INTENSIDAD[b.cualidad] &&
                            (() => {
                              const fila = TABLA_INTENSIDAD[b.cualidad];
                              return (
                                <>
                                  <span className="dp-muted font-mono text-[10px]">
                                    reps {fila.reps} · {fila.porcentaje1RM} · series/ejerc. {fila.seriesPorEjercicio}
                                    · desc. {fila.descanso}
                                  </span>
                                  {descansoDisponible(b) && (
                                    <button
                                      type="button"
                                      onClick={() => aplicarDescanso(bIdx)}
                                      className="dp-text-amber text-[10px] font-medium hover:underline"
                                    >
                                      Aplicar descanso sugerido
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                        </div>

                        {b.exercises.length > 0 && (
                          <div
                            className="dp-muted grid gap-2 pb-1 text-[10px] font-medium tracking-wide uppercase"
                            style={{ gridTemplateColumns: EXERCISE_ROW_GRID_EDITABLE }}
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
                              datalistId="biblioteca-datalist-grupo"
                              etiquetaBloque={{ grupoMuscular: b.grupoMuscular, cualidad: b.cualidad }}
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
                      </div>

                      <button
                        type="button"
                        onClick={() => insertBloqueAfter(bIdx)}
                        className="dp-muted hover:dp-text-brand mt-1.5 flex w-full items-center justify-center gap-1 py-1 text-[11px] font-medium"
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

          <div className="flex flex-wrap items-center gap-3">
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
