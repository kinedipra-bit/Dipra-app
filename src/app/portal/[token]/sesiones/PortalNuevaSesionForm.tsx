"use client";

import { useEffect, useState, useTransition } from "react";
import { PILARES_KEYS, emptySesionPilares } from "@/lib/dipra/constants";
import { agruparPorBloque } from "@/lib/dipra/agruparEjercicios";
import { EscalaUnoADiez } from "@/app/(app)/clientes/[id]/sesiones/EscalaUnoADiez";
import type { DiaPlan, EjercicioSesion } from "@/lib/dipra/types";
import { crearSesionPortal } from "./actions";

function pilarInvertido(p: (typeof PILARES_KEYS)[number]): boolean {
  return "invertido" in p && p.invertido === true;
}

type Draft = {
  diaPlanLabel: string;
  pilares: ReturnType<typeof emptySesionPilares>;
  comentarios: string;
  ejercicios: EjercicioSesion[];
};

function draftKey(token: string) {
  return `dipra:portal:${token}:nueva-sesion`;
}

// Se guarda en localStorage en cada cambio, no solo al final: si el atleta
// pierde señal en el gimnasio justo al terminar de marcar sus pilares, no
// pierde lo que ya cargó — al volver a abrir el formulario (o si falla el
// guardado y reintenta) sus respuestas siguen ahí.
function leerDraft(token: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(token));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardarDraft(token: string, draft: Draft) {
  try {
    localStorage.setItem(draftKey(token), JSON.stringify(draft));
  } catch {
    // localStorage puede fallar (modo privado, storage lleno, etc.) — no es
    // crítico, el formulario sigue funcionando igual, solo sin respaldo local.
  }
}

function borrarDraft(token: string) {
  try {
    localStorage.removeItem(draftKey(token));
  } catch {
    // ver nota en guardarDraft
  }
}

// Arma la lista de ejercicios de un día a partir de la planificación, igual
// que elegirDia en la vista del profesional (SesionesClient.tsx) — el
// atleta ve su rutina de ESE día puntual y comenta/ajusta ahí mismo, en vez
// de comentar en "Mi rutina" (donde el comentario queda pisado en el
// ejercicio y no se sabe de qué sesión/fecha era).
function ejerciciosDelDia(dia: DiaPlan | undefined): EjercicioSesion[] {
  if (!dia) return [];
  const ejercicios: EjercicioSesion[] = [];
  dia.bloques.forEach((b) =>
    b.exercises.forEach((e) => {
      ejercicios.push({
        id: crypto.randomUUID(),
        nombre: e.nombre,
        seriesPlan: e.series,
        repsPlan: e.reps,
        kgPlan: e.kg,
        pesosSeriesPlan: e.pesosSeries,
        seriesReal: e.series,
        repsReal: e.reps,
        kgReal: e.kg,
        pesosSeriesReal: e.pesosSeries,
        unilateral: e.unilateral,
        pesoCadaUno: e.pesoCadaUno,
        tipoCarga: e.tipoCarga,
        tiempoSerie: e.tiempoSerie,
        bloqueTitle: b.title,
        rpe: "",
        comentario: "",
      });
    })
  );
  return ejercicios;
}

function nuevoDraft(dias: DiaPlan[]): Draft {
  const primerDia = dias[0];
  return {
    diaPlanLabel: primerDia?.label ?? "",
    pilares: emptySesionPilares(),
    comentarios: "",
    ejercicios: ejerciciosDelDia(primerDia),
  };
}

export function PortalNuevaSesionForm({ token, dias }: { token: string; dias: DiaPlan[] }) {
  const [abierto, setAbierto] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => nuevoDraft(dias));
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al montar, si había un borrador guardado (de una sesión anterior que no
  // se llegó a enviar), lo recupera y abre el formulario directamente.
  // Tiene que ser un efecto (no un lazy initializer de useState): localStorage
  // no existe en el render de servidor, así que leerlo ahí adentro
  // desincronizaría el HTML del servidor del primer render del cliente.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const guardado = leerDraft(token);
    if (guardado) {
      setDraft(guardado);
      setAbierto(true);
    }
  }, [token]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Respalda cada cambio mientras el formulario está abierto.
  useEffect(() => {
    if (!abierto) return;
    guardarDraft(token, draft);
  }, [token, abierto, draft]);

  const elegirDia = (label: string) => {
    const dia = dias.find((d) => d.label === label);
    setDraft((prev) => ({ ...prev, diaPlanLabel: label, ejercicios: ejerciciosDelDia(dia) }));
  };

  const actualizarEjercicio = (idx: number, patch: Partial<EjercicioSesion>) => {
    setDraft((prev) => {
      const ejercicios = [...prev.ejercicios];
      ejercicios[idx] = { ...ejercicios[idx], ...patch };
      return { ...prev, ejercicios };
    });
  };

  const enviar = () => {
    setError(null);
    startTransition(async () => {
      try {
        await crearSesionPortal(token, {
          fecha: new Date().toISOString().slice(0, 10),
          dia_plan_label: draft.diaPlanLabel,
          pilares: draft.pilares,
          comentarios: draft.comentarios,
          ejercicios: draft.ejercicios,
        });
        borrarDraft(token);
        setDraft(nuevoDraft(dias));
        setEnviado(true);
        setAbierto(false);
      } catch {
        // No se limpia nada: el borrador sigue en localStorage y en el
        // estado del formulario, así el atleta puede reintentar sin volver
        // a cargar todo si se cortó la conexión.
        setError("No se pudo guardar — revisá tu conexión y volvé a intentar. Tus respuestas siguen acá.");
      }
    });
  };

  const inputClass =
    "rounded-md border border-white/20 bg-white/5 px-1.5 py-0.5 text-center font-mono text-xs text-white outline-none focus:dp-border-brand";

  if (!abierto) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setDraft((prev) => (prev.diaPlanLabel ? prev : nuevoDraft(dias)));
            setAbierto(true);
            setEnviado(false);
          }}
          className="dp-bg-brand rounded-xl px-4 py-2 text-sm font-medium text-white"
        >
          + Registrar mi sesión de hoy
        </button>
        {enviado && <span className="dp-muted ml-3 self-center text-xs">¡Sesión registrada!</span>}
      </div>
    );
  }

  return (
    <div className="dp-surface flex flex-col gap-4 rounded-2xl p-5 shadow-sm">
      <h2 className="font-medium dp-text-heading">¿Cómo estuvo tu entrenamiento de hoy?</h2>

      {dias.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">¿Qué día hiciste?</span>
          <select
            value={draft.diaPlanLabel}
            onChange={(e) => elegirDia(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
          >
            {dias.map((d) => (
              <option key={d.id} value={d.label}>
                {d.label}
                {d.foco ? ` — ${d.foco}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-wrap gap-4">
        {PILARES_KEYS.map((p) => (
          <div key={p.key} className="flex flex-col gap-1">
            <span className="dp-muted text-[10px] font-medium">{p.label}</span>
            <EscalaUnoADiez
              value={draft.pilares[p.key]}
              onChange={(v) => setDraft((prev) => ({ ...prev, pilares: { ...prev.pilares, [p.key]: v } }))}
              invertido={pilarInvertido(p)}
            />
          </div>
        ))}
      </div>

      {draft.diaPlanLabel && (
        <div className="dp-scope-dark dp-border-brand rounded-xl border-l-4 p-3">
          <p className="dp-text-heading mb-2 text-xs font-semibold uppercase tracking-wide">
            Tu rutina de {draft.diaPlanLabel} — anotá lo que hiciste realmente
          </p>
          {draft.ejercicios.length === 0 ? (
            <p className="dp-muted text-xs">Este día no tiene ejercicios cargados todavía.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {agruparPorBloque(draft.ejercicios).map((grupo, gIdx) => (
                <div key={gIdx}>
                  {grupo.bloqueTitle && (
                    <p className="dp-text-brand mb-1 text-[11px] font-semibold tracking-wide uppercase">
                      {grupo.bloqueTitle}
                    </p>
                  )}
                  <div className="flex flex-col divide-y divide-white/10">
                    {grupo.items.map(({ ejercicio: ex, idx }) => {
                      const pesosPlan = (ex.pesosSeriesPlan ?? []).filter((p) => Number(p) > 0);
                      const kgPlanTexto =
                        pesosPlan.length > 0 ? pesosPlan.map((p) => Number(p) || 0).join("/") : String(ex.kgPlan);
                      const pesosRealActivo = (ex.pesosSeriesReal ?? []).some((p) => Number(p) > 0);
                      const cambiarPesoReal = (i: number, value: string) => {
                        const largo = Math.max(ex.seriesReal, pesosPlan.length, 1);
                        const current = Array.from(
                          { length: largo },
                          (_, idx2) => ex.pesosSeriesReal?.[idx2] ?? ex.kgReal ?? 0
                        );
                        current[i] = value === "" ? "" : Number(value);
                        actualizarEjercicio(idx, { pesosSeriesReal: current });
                      };
                      return (
                        <div key={ex.id} className="py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="dp-text-heading text-sm font-medium">{ex.nombre}</span>
                            <span className="dp-muted font-mono text-[11px]">
                              plan {ex.seriesPlan}×{ex.repsPlan}
                              {ex.unilateral ? " c/u" : ""}×{kgPlanTexto}kg{ex.pesoCadaUno ? " c/u" : ""}
                            </span>
                          </div>
                          {(ex.tipoCarga || ex.tiempoSerie) && (
                            <p className="dp-muted text-[10px]">
                              {[ex.tipoCarga, ex.tiempoSerie].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="dp-muted text-[10px]">Series</span>
                            <input
                              type="number"
                              value={ex.seriesReal}
                              onChange={(e) => actualizarEjercicio(idx, { seriesReal: Number(e.target.value) })}
                              style={{ width: 40 }}
                              className={inputClass}
                            />
                            <span className="dp-muted text-[10px]">Reps</span>
                            <input
                              type="number"
                              value={ex.repsReal}
                              onChange={(e) => actualizarEjercicio(idx, { repsReal: Number(e.target.value) })}
                              style={{ width: 40 }}
                              className={inputClass}
                            />
                            <span className="dp-muted text-[10px]">Kg</span>
                            {pesosRealActivo ? (
                              Array.from({ length: Math.max(ex.seriesReal, pesosPlan.length, 1) }).map((_, i) => (
                                <input
                                  key={i}
                                  type="number"
                                  value={ex.pesosSeriesReal?.[i] ?? ex.kgReal ?? 0}
                                  onChange={(e) => cambiarPesoReal(i, e.target.value)}
                                  style={{ width: 48 }}
                                  className={inputClass}
                                />
                              ))
                            ) : (
                              <input
                                type="number"
                                value={ex.kgReal}
                                onChange={(e) => actualizarEjercicio(idx, { kgReal: Number(e.target.value) })}
                                style={{ width: 56 }}
                                className={inputClass}
                              />
                            )}
                            <span className="dp-muted text-[10px]">RPE</span>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={ex.rpe}
                              onChange={(e) => actualizarEjercicio(idx, { rpe: e.target.value })}
                              placeholder="—"
                              style={{ width: 40 }}
                              className={inputClass}
                            />
                          </div>
                          <input
                            value={ex.comentario ?? ""}
                            onChange={(e) => actualizarEjercicio(idx, { comentario: e.target.value })}
                            placeholder="Comentario de este ejercicio hoy — ej: no pude con el peso, dolió el hombro…"
                            className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:dp-border-brand"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="dp-body font-medium">Observaciones generales (opcional)</span>
        <textarea
          value={draft.comentarios}
          onChange={(e) => setDraft((prev) => ({ ...prev, comentarios: e.target.value }))}
          rows={3}
          placeholder="¿Cómo te sentiste? ¿Algo que quieras contarle a tu profesional?"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
        />
      </label>

      {error && <p className="dp-bg-alert-soft dp-alert rounded-lg px-3 py-2 text-xs">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={enviar}
          disabled={pending}
          className="dp-bg-brand rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Guardando…" : error ? "Reintentar" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            borrarDraft(token);
            setAbierto(false);
            setError(null);
          }}
          className="dp-muted text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
