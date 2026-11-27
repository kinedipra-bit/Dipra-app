"use client";

import { Fragment, useState, useTransition } from "react";
import { crearPruebaEspecial, actualizarPruebaEspecial, eliminarPruebaEspecial } from "./actions";
import { TOBILLO_SEMAFORO_AYUDA } from "@/lib/dipra/constants";
import { ClearingToggle } from "./FmsSection";
import type { PruebaEspecialEntry } from "@/lib/dipra/types";

type Color = "rojo" | "amarillo" | "verde";
const COLORES: { key: Color; clase: string }[] = [
  { key: "rojo", clase: "dp-bg-alert" },
  { key: "amarillo", clase: "dp-bg-amber" },
  { key: "verde", clase: "dp-bg-brand" },
];

// El color lo elige el profesional a mano (no se calcula del cm) — ver
// TOBILLO_SEMAFORO_AYUDA para el criterio, mostrado en el ícono "?".
function SemaforoToggle({ value, onChange }: { value: Color | null; onChange: (v: Color | null) => void }) {
  return (
    <div className="flex items-center gap-1">
      {COLORES.map((c) => (
        <button
          key={c.key}
          type="button"
          title={c.key}
          onClick={() => onChange(value === c.key ? null : c.key)}
          className={`h-5 w-5 rounded-full border-2 ${value === c.key ? c.clase : "border-black/10 bg-white"} ${
            value === c.key ? "border-transparent" : ""
          }`}
        />
      ))}
    </div>
  );
}

const HOMBRO_TESTS: { key: "hombro_arco_doloroso" | "neer" | "jobe" | "hawkins"; label: string }[] = [
  { key: "hombro_arco_doloroso", label: "Arco doloroso" },
  { key: "neer", label: "Neer" },
  { key: "jobe", label: "Jobe" },
  { key: "hawkins", label: "Hawkins" },
];

export function PruebasEspecialesSection({
  clienteId,
  initialItems,
}: {
  clienteId: string;
  initialItems: PruebaEspecialEntry[];
}) {
  const [items, setItems] = useState<PruebaEspecialEntry[]>(
    [...initialItems].sort((a, b) => b.fecha.localeCompare(a.fecha))
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const agregar = () => {
    setError(null);
    startTransition(async () => {
      try {
        const nueva = await crearPruebaEspecial(clienteId);
        setItems((prev) => [nueva, ...prev]);
      } catch {
        setError("No se pudo agregar — revisá tu conexión y volvé a intentar.");
      }
    });
  };

  const setCampo = <K extends keyof PruebaEspecialEntry>(id: string, key: K, value: PruebaEspecialEntry[K]) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [key]: value } : it)));

  const guardarCampo = <K extends keyof PruebaEspecialEntry>(id: string, key: K, value: PruebaEspecialEntry[K]) => {
    startTransition(async () => {
      await actualizarPruebaEspecial(clienteId, id, { [key]: value });
    });
  };

  const cambiar = <K extends keyof PruebaEspecialEntry>(id: string, key: K, value: PruebaEspecialEntry[K]) => {
    setCampo(id, key, value);
    guardarCampo(id, key, value);
  };

  const quitar = (id: string) => {
    if (!confirm("¿Eliminar esta evaluación? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      await eliminarPruebaEspecial(clienteId, id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-medium dp-text-heading">Pruebas especiales</h2>
        <button
          type="button"
          onClick={agregar}
          disabled={pending}
          className="dp-bg-brand rounded-lg px-3.5 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          + Nueva evaluación
        </button>
      </div>
      <p className="dp-muted mb-3 text-xs">
        Dorsiflexión de tobillo, hombro (arco doloroso/Neer/Jobe/Hawkins), ASLR de pie y rotación torácica —
        se ven acá sin tener que abrir el FMS.
      </p>

      {error && <p className="dp-alert mb-2 text-xs font-medium">⚠ {error}</p>}

      {items.length === 0 ? (
        <p className="dp-muted py-4 text-center text-sm">Sin pruebas especiales registradas todavía.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((it) => (
            <div key={it.id} className="dp-bg-faint rounded-xl p-3">
              <div className="mb-3 flex items-center justify-between">
                <input
                  type="date"
                  value={it.fecha}
                  onChange={(e) => setCampo(it.id, "fecha", e.target.value)}
                  onBlur={(e) => guardarCampo(it.id, "fecha", e.target.value)}
                  className="rounded-lg border border-black/10 bg-white px-2 py-1 font-mono text-xs outline-none focus:dp-border-brand"
                />
                <button type="button" onClick={() => quitar(it.id)} className="dp-muted hover:dp-alert text-xs">
                  ✕ Eliminar
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center gap-1.5">
                    <p className="dp-text-brand text-xs font-semibold uppercase tracking-wide">
                      Dorsiflexión de tobillo
                    </p>
                    <span title={TOBILLO_SEMAFORO_AYUDA} className="dp-muted cursor-help text-xs">
                      ⓘ
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {(["der", "izq"] as const).map((lado) => (
                      <div key={lado} className="flex items-center gap-2">
                        <span className="dp-muted w-8 text-[10px] font-medium uppercase">{lado}</span>
                        <input
                          type="number"
                          placeholder="cm"
                          value={it[`tobillo_${lado}_cm`] ?? ""}
                          onChange={(e) => setCampo(it.id, `tobillo_${lado}_cm`, e.target.value === "" ? null : Number(e.target.value))}
                          onBlur={(e) =>
                            guardarCampo(it.id, `tobillo_${lado}_cm`, e.target.value === "" ? null : Number(e.target.value))
                          }
                          className="w-16 rounded-md border border-black/10 bg-white px-1.5 py-0.5 text-center font-mono text-xs outline-none focus:dp-border-brand"
                        />
                        <SemaforoToggle
                          value={it[`tobillo_${lado}_color`]}
                          onChange={(v) => cambiar(it.id, `tobillo_${lado}_color`, v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="dp-text-brand mb-1 text-xs font-semibold uppercase tracking-wide">Hombro</p>
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1">
                    <span />
                    <span className="dp-muted text-[10px] font-medium uppercase">Der</span>
                    <span className="dp-muted text-[10px] font-medium uppercase">Izq</span>
                    {HOMBRO_TESTS.map((t) => (
                      <Fragment key={t.key}>
                        <span className="dp-body text-xs">{t.label}</span>
                        <ClearingToggle
                          value={it[`${t.key}_der`]}
                          onChange={(v) => cambiar(it.id, `${t.key}_der`, v)}
                        />
                        <ClearingToggle
                          value={it[`${t.key}_izq`]}
                          onChange={(v) => cambiar(it.id, `${t.key}_izq`, v)}
                        />
                      </Fragment>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="dp-text-brand mb-1 text-xs font-semibold uppercase tracking-wide">
                    ASLR de pie / punta de pies
                  </p>
                  <div className="mb-1.5 flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="dp-muted text-[10px] font-medium uppercase">Der</span>
                      <ClearingToggle value={it.aslr_pie_der} onChange={(v) => cambiar(it.id, "aslr_pie_der", v)} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="dp-muted text-[10px] font-medium uppercase">Izq</span>
                      <ClearingToggle value={it.aslr_pie_izq} onChange={(v) => cambiar(it.id, "aslr_pie_izq", v)} />
                    </div>
                  </div>
                  <input
                    value={it.aslr_pie_comentario}
                    onChange={(e) => setCampo(it.id, "aslr_pie_comentario", e.target.value)}
                    onBlur={(e) => guardarCampo(it.id, "aslr_pie_comentario", e.target.value)}
                    placeholder="Comentario (ej. pierde control pélvico)"
                    className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs outline-none focus:dp-border-brand"
                  />
                </div>

                <div>
                  <p className="dp-text-brand mb-1 text-xs font-semibold uppercase tracking-wide">
                    Rotación torácica (respecto de lumbar)
                  </p>
                  <div className="mb-1.5 flex items-center gap-3">
                    {(["der", "izq"] as const).map((lado) => (
                      <div key={lado} className="flex items-center gap-1">
                        <span className="dp-muted text-[10px] font-medium uppercase">{lado}</span>
                        <input
                          type="number"
                          placeholder="°"
                          value={it[`rotacion_toracica_${lado}_grados`] ?? ""}
                          onChange={(e) =>
                            setCampo(
                              it.id,
                              `rotacion_toracica_${lado}_grados`,
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                          onBlur={(e) =>
                            guardarCampo(
                              it.id,
                              `rotacion_toracica_${lado}_grados`,
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                          className="w-14 rounded-md border border-black/10 bg-white px-1.5 py-0.5 text-center font-mono text-xs outline-none focus:dp-border-brand"
                        />
                        <span className="dp-muted text-[10px]">dolor</span>
                        <ClearingToggle
                          value={it[`rotacion_toracica_dolor_${lado}`]}
                          onChange={(v) => cambiar(it.id, `rotacion_toracica_dolor_${lado}`, v)}
                        />
                      </div>
                    ))}
                  </div>
                  <input
                    value={it.rotacion_toracica_comentario}
                    onChange={(e) => setCampo(it.id, "rotacion_toracica_comentario", e.target.value)}
                    onBlur={(e) => guardarCampo(it.id, "rotacion_toracica_comentario", e.target.value)}
                    placeholder="Comentario"
                    className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs outline-none focus:dp-border-brand"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="dp-muted text-[10px] font-medium uppercase tracking-wide">Notas generales</label>
                <textarea
                  rows={2}
                  value={it.notas}
                  onChange={(e) => setCampo(it.id, "notas", e.target.value)}
                  onBlur={(e) => guardarCampo(it.id, "notas", e.target.value)}
                  className="mt-0.5 w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs outline-none focus:dp-border-brand"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
