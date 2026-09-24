"use client";

import { useState, useTransition } from "react";
import { tonoEscalaPilar } from "@/lib/dipra/calc";
import { PILARES_KEYS, TIPOS_SESION, emptySesionPilares } from "@/lib/dipra/constants";
import type { DiaPlan, EjercicioSesion, Sesion } from "@/lib/dipra/types";
import { crearSesion, eliminarSesion, type NuevaSesionInput } from "./actions";
import { EscalaUnoADiez } from "./EscalaUnoADiez";

const inputClass = "rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand";

function nuevoDraft(esPrimeraSesion: boolean): NuevaSesionInput {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    tipo: TIPOS_SESION[0],
    dia_plan_label: "",
    es_primera_sesion: esPrimeraSesion,
    comentarios_pre: "",
    pilares: emptySesionPilares(),
    comentarios: "",
    ejercicios: [],
  };
}

// Solo el pilar "Estrés" trae la marca `invertido` (ver constants.ts) — el
// resto del union type de PILARES_KEYS no tiene esa propiedad en absoluto.
function pilarInvertido(p: (typeof PILARES_KEYS)[number]): boolean {
  return "invertido" in p && p.invertido === true;
}

function pilarBajo(pilares: NuevaSesionInput["pilares"], esPrimeraSesion: boolean) {
  if (esPrimeraSesion) return false;
  return PILARES_KEYS.some((p) => {
    const raw = pilares[p.key];
    const v = Number(raw);
    return raw !== "" && !isNaN(v) && tonoEscalaPilar(v, pilarInvertido(p)) === "dp-bg-alert";
  });
}

function tieneAlerta(s: Sesion) {
  return pilarBajo(s.pilares, s.es_primera_sesion);
}

export function SesionesClient({
  clienteId,
  sesionesIniciales,
  diasPlan,
}: {
  clienteId: string;
  sesionesIniciales: Sesion[];
  diasPlan: DiaPlan[];
}) {
  const [modo, setModo] = useState<"list" | "form">("list");
  const [draft, setDraft] = useState<NuevaSesionInput | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sesiones = [...sesionesIniciales].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const iniciarNueva = () => {
    setDraft(nuevoDraft(sesiones.length === 0));
    setModo("form");
  };

  const cancelar = () => {
    setDraft(null);
    setModo("list");
  };

  const elegirDia = (label: string) => {
    if (!draft) return;
    const dia = diasPlan.find((d) => d.label === label);
    const ejercicios: EjercicioSesion[] = [];
    if (dia) {
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
            rpe: "",
          });
        })
      );
    }
    setDraft({ ...draft, dia_plan_label: label, ejercicios });
  };

  const updateEjercicio = (idx: number, patch: Partial<EjercicioSesion>) => {
    if (!draft) return;
    const next = [...draft.ejercicios];
    next[idx] = { ...next[idx], ...patch };
    setDraft({ ...draft, ejercicios: next });
  };

  const guardar = () => {
    if (!draft) return;
    startTransition(async () => {
      await crearSesion(clienteId, draft);
      setDraft(null);
      setModo("list");
    });
  };

  const borrarSesion = (id: string) => {
    if (!confirm("¿Eliminar esta sesión? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    startTransition(async () => {
      await eliminarSesion(clienteId, id);
      setDeletingId(null);
    });
  };

  if (modo === "form" && draft) {
    const alerta = pilarBajo(draft.pilares, draft.es_primera_sesion);

    return (
      <div className="dp-surface flex flex-col gap-4 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="dp-text-heading font-medium">Nueva sesión</h3>
          <button type="button" onClick={cancelar} className="dp-muted text-sm hover:dp-text-brand">
            Cancelar
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Fecha</span>
            <input
              type="date"
              value={draft.fecha}
              onChange={(e) => setDraft({ ...draft, fecha: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Tipo de sesión</span>
            <select
              value={draft.tipo}
              onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}
              className={inputClass}
            >
              {TIPOS_SESION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Día del plan</span>
            <select
              value={draft.dia_plan_label}
              onChange={(e) => elegirDia(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecciona…</option>
              {diasPlan.map((d) => (
                <option key={d.id} value={d.label}>
                  {d.label}
                  {d.foco ? ` — ${d.foco}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="dp-body flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.es_primera_sesion}
            onChange={(e) => setDraft({ ...draft, es_primera_sesion: e.target.checked })}
          />
          Es la primera sesión con este cliente
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Comentarios pre-sesión — cómo llega la persona</span>
          <textarea
            rows={2}
            value={draft.comentarios_pre}
            onChange={(e) => setDraft({ ...draft, comentarios_pre: e.target.value })}
            placeholder="Cómo se siente hoy, energía, dolores previos, ánimo…"
            className={inputClass}
          />
        </label>

        <div>
          <p className="dp-text-heading mb-2 text-xs font-semibold uppercase tracking-wide">
            Pilares del rendimiento — hoy
          </p>
          {draft.es_primera_sesion ? (
            <div className="grid grid-cols-2 gap-3">
              {PILARES_KEYS.map((p) => (
                <label key={p.key} className="flex flex-col gap-1 text-sm">
                  <span className="dp-body font-medium">{p.label}</span>
                  <textarea
                    rows={2}
                    value={draft.pilares[p.key]}
                    onChange={(e) => setDraft({ ...draft, pilares: { ...draft.pilares, [p.key]: e.target.value } })}
                    placeholder="Cómo lo describe el cliente…"
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {PILARES_KEYS.map((p) => (
                <div key={p.key} className="flex items-center gap-3">
                  <span className="dp-body w-21 shrink-0 text-xs font-medium">{p.label}</span>
                  <EscalaUnoADiez
                    value={draft.pilares[p.key]}
                    onChange={(v) => setDraft({ ...draft, pilares: { ...draft.pilares, [p.key]: v } })}
                    invertido={pilarInvertido(p)}
                  />
                  <span className="dp-muted font-mono text-xs">{draft.pilares[p.key] || "—"}/10</span>
                </div>
              ))}
            </div>
          )}
          {alerta && (
            <p className="dp-alert mt-2 text-xs">⚠ Hay al menos un pilar en rojo — revisar antes de cargar intensidad.</p>
          )}
        </div>

        {draft.dia_plan_label && (
          <div>
            <p className="dp-text-heading mb-2 text-xs font-semibold uppercase tracking-wide">
              Ejecución real vs. planificado
            </p>
            <div
              className="dp-muted grid gap-2 pb-1 text-[10px] font-medium uppercase tracking-wide"
              style={{ gridTemplateColumns: "1.4fr 0.9fr 0.5fr 0.5fr 0.9fr 0.4fr" }}
            >
              <span>Ejercicio</span>
              <span>Plan (S×R×Kg)</span>
              <span className="text-center">Ser.</span>
              <span className="text-center">Rep.</span>
              <span className="text-center">Kg real</span>
              <span className="text-center">RPE</span>
            </div>
            <div className="divide-y divide-black/5">
              {draft.ejercicios.map((ex, idx) => {
                const pesosPlan = (ex.pesosSeriesPlan ?? []).filter((p) => Number(p) > 0);
                const kgPlanTexto = pesosPlan.length > 0 ? pesosPlan.map((p) => Number(p) || 0).join("/") : String(ex.kgPlan);
                const pesosRealActivo = (ex.pesosSeriesReal ?? []).some((p) => Number(p) > 0);
                const cambiarPesoReal = (i: number, value: string) => {
                  const largo = Math.max(ex.seriesReal, pesosPlan.length, 1);
                  const current = Array.from({ length: largo }, (_, idx2) => ex.pesosSeriesReal?.[idx2] ?? ex.kgReal ?? 0);
                  current[i] = value === "" ? "" : Number(value);
                  updateEjercicio(idx, { pesosSeriesReal: current });
                };
                return (
                  <div
                    key={ex.id}
                    className="grid items-center gap-2 py-1.5"
                    style={{ gridTemplateColumns: "1.4fr 0.9fr 0.5fr 0.5fr 0.9fr 0.4fr" }}
                  >
                    <div className="min-w-0">
                      <span className="dp-text-heading block truncate text-sm">{ex.nombre}</span>
                      {(ex.tipoCarga || ex.tiempoSerie) && (
                        <span className="dp-muted text-[10px]">
                          {[ex.tipoCarga, ex.tiempoSerie].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                    <span className="dp-muted font-mono text-xs">
                      {ex.seriesPlan}×{ex.repsPlan}
                      {ex.unilateral ? " c/u" : ""}×{kgPlanTexto}kg{ex.pesoCadaUno ? " c/u" : ""}
                    </span>
                    <input
                      type="number"
                      value={ex.seriesReal}
                      onChange={(e) => updateEjercicio(idx, { seriesReal: Number(e.target.value) })}
                      className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-sm outline-none focus:dp-border-brand"
                    />
                    <input
                      type="number"
                      value={ex.repsReal}
                      onChange={(e) => updateEjercicio(idx, { repsReal: Number(e.target.value) })}
                      className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-sm outline-none focus:dp-border-brand"
                    />
                    {pesosRealActivo ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {Array.from({ length: Math.max(ex.seriesReal, pesosPlan.length, 1) }).map((_, i) => (
                          <input
                            key={i}
                            type="number"
                            value={ex.pesosSeriesReal?.[i] ?? ex.kgReal ?? 0}
                            onChange={(e) => cambiarPesoReal(i, e.target.value)}
                            style={{ width: 36 }}
                            className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-xs outline-none focus:dp-border-brand"
                          />
                        ))}
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={ex.kgReal}
                        onChange={(e) => updateEjercicio(idx, { kgReal: Number(e.target.value) })}
                        className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-sm outline-none focus:dp-border-brand"
                      />
                    )}
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={ex.rpe}
                      onChange={(e) => updateEjercicio(idx, { rpe: e.target.value })}
                      placeholder="—"
                      className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-sm outline-none focus:dp-border-brand"
                    />
                  </div>
                );
              })}
              {draft.ejercicios.length === 0 && (
                <p className="dp-muted py-2 text-xs">Este día no tiene ejercicios cargados en la planificación todavía.</p>
              )}
            </div>
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Comentarios post sesión — dolor · dificultad · ajuste de carga</span>
          <textarea
            rows={3}
            value={draft.comentarios}
            onChange={(e) => setDraft({ ...draft, comentarios: e.target.value })}
            className={inputClass}
          />
        </label>

        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="dp-bg-brand w-fit rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar sesión"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={iniciarNueva}
          className="dp-bg-brand rounded-xl px-3.5 py-2 text-sm font-medium text-white"
        >
          + Nueva sesión
        </button>
      </div>

      {sesiones.length === 0 ? (
        <p className="dp-muted dp-surface rounded-2xl p-8 text-center text-sm shadow-sm">
          Todavía no hay sesiones registradas para este cliente.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sesiones.map((s) => {
            const expanded = expandedId === s.id;
            const alerta = tieneAlerta(s);
            return (
              <div key={s.id} className="dp-surface overflow-hidden rounded-2xl shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="w-14 shrink-0 text-center">
                    <p className="dp-text-heading font-mono text-sm font-semibold">
                      {s.fecha.slice(8, 10)}/{s.fecha.slice(5, 7)}
                    </p>
                    <p className="dp-muted text-[10px]">{s.fecha.slice(0, 4)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="dp-text-heading text-sm font-medium">
                      {s.tipo || "Kinesiología"}
                      {s.dia_plan_label ? ` · ${s.dia_plan_label}` : ""}
                    </p>
                    <p className="dp-muted truncate text-xs">{s.comentarios || "Sin comentarios"}</p>
                  </div>
                  {alerta && <span className="dp-alert shrink-0 text-xs font-medium">⚠ Pilar bajo</span>}
                  <span className={`dp-muted shrink-0 text-xs transition-transform ${expanded ? "rotate-90" : ""}`}>
                    ›
                  </span>
                </button>
                {expanded && (
                  <div className="flex flex-col gap-3 border-t border-black/5 px-4 pb-4 pt-3">
                    <div className="grid grid-cols-5 gap-2">
                      {PILARES_KEYS.map((p) => {
                        const val = s.pilares[p.key];
                        const numerico = !s.es_primera_sesion && val !== "" && !isNaN(Number(val));
                        const tono = numerico ? tonoEscalaPilar(Number(val), pilarInvertido(p)) : "dp-bg-faint";
                        return (
                          <div key={p.key} className={`rounded-lg p-2 text-center ${tono}`}>
                            <p className={`text-[10px] font-medium ${numerico ? "text-white/80" : "dp-muted"}`}>
                              {p.label}
                            </p>
                            <p className={`font-mono text-sm font-semibold ${numerico ? "text-white" : "dp-text-heading"}`}>
                              {val || "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    {s.comentarios_pre && (
                      <div>
                        <p className="dp-muted mb-0.5 text-[10px] font-medium uppercase tracking-wide">Pre-sesión</p>
                        <p className="dp-text-heading text-sm">{s.comentarios_pre}</p>
                      </div>
                    )}
                    {s.ejercicios.length > 0 && (
                      <div className="divide-y divide-black/5">
                        {s.ejercicios.map((ex) => {
                          const kgPlanTexto =
                            ex.pesosSeriesPlan && ex.pesosSeriesPlan.filter((p) => Number(p) > 0).length > 0
                              ? ex.pesosSeriesPlan.map((p) => Number(p) || 0).join("/")
                              : String(ex.kgPlan);
                          const kgRealTexto =
                            ex.pesosSeriesReal && ex.pesosSeriesReal.filter((p) => Number(p) > 0).length > 0
                              ? ex.pesosSeriesReal.map((p) => Number(p) || 0).join("/")
                              : String(ex.kgReal);
                          return (
                            <div key={ex.id} className="flex items-center justify-between py-1.5 text-sm">
                              <span className="dp-text-heading">{ex.nombre}</span>
                              <span className="dp-muted font-mono text-xs">
                                plan {ex.seriesPlan}×{ex.repsPlan}×{kgPlanTexto}kg → real {ex.seriesReal}×
                                {ex.repsReal}×{kgRealTexto}kg{ex.rpe ? ` · RPE ${ex.rpe}` : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {s.comentarios && (
                      <div>
                        <p className="dp-muted mb-0.5 text-[10px] font-medium uppercase tracking-wide">Post-sesión</p>
                        <p className="dp-text-heading text-sm">{s.comentarios}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => borrarSesion(s.id)}
                      disabled={pending && deletingId === s.id}
                      className="dp-alert w-fit text-xs hover:underline disabled:opacity-50"
                    >
                      {pending && deletingId === s.id ? "Eliminando…" : "Eliminar sesión"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
