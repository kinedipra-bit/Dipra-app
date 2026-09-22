"use client";

import { useState, useTransition } from "react";
import { updateFms } from "./actions";
import { FMS_SUGERENCIAS } from "@/lib/dipra/constants";
import { calcularFinalesFms, totalFms, type FmsData } from "@/lib/dipra/calc";

type LadoKey = "d" | "i" | "der" | "izq";
type ParKey = "pasoValla" | "estocada" | "hombro" | "aslr" | "rotacion";
type ClearingParKey = "clearingTobDolor" | "clearingTobMob" | "clearingHombro" | "clearingMuneca";

function ClearingToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex w-fit overflow-hidden rounded-md border border-black/10 text-[11px] font-medium">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-2 py-0.5 ${!value ? "dp-bg-brand text-white" : "dp-muted bg-white"}`}
      >
        neg
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-2 py-0.5 ${value ? "dp-bg-alert text-white" : "dp-muted bg-white"}`}
      >
        pos
      </button>
    </div>
  );
}

function RawInput({
  value,
  onChange,
  width = 44,
}: {
  value: string | number;
  onChange: (v: string) => void;
  width?: number;
}) {
  return (
    <input
      type="number"
      min={0}
      max={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width }}
      className="rounded-md border border-black/10 px-1 py-0.5 text-center font-mono text-sm outline-none focus:dp-border-brand"
    />
  );
}

function finalCellClass(final: number | null | undefined) {
  if (final === 0 || final === 1) return "dp-bg-alert text-white";
  if (final === 2) return "dp-bg-amber text-white";
  if (final !== null && final !== undefined) return "dp-bg-faint dp-text-heading";
  return "dp-muted";
}

function FmsRow({
  label,
  dValue,
  iValue,
  onD,
  onI,
  single,
  singleValue,
  onSingle,
  final,
}: {
  label: string;
  dValue?: string | number;
  iValue?: string | number;
  onD?: (v: string) => void;
  onI?: (v: string) => void;
  single?: boolean;
  singleValue?: string | number;
  onSingle?: (v: string) => void;
  final: number | null | undefined;
}) {
  return (
    <div
      className="grid items-center gap-2 border-b border-black/5 py-1.5"
      style={{ gridTemplateColumns: "1.4fr 0.3fr 0.6fr 0.6fr" }}
    >
      <span className="dp-body text-sm">{label}</span>
      {single ? (
        <>
          <span />
          <RawInput value={singleValue ?? ""} onChange={(v) => onSingle?.(v)} />
        </>
      ) : (
        <>
          <div className="dp-muted flex flex-col gap-1 text-[10px] font-medium">
            <span>D</span>
            <span>I</span>
          </div>
          <div className="flex flex-col gap-1">
            <RawInput value={dValue ?? ""} onChange={(v) => onD?.(v)} width={36} />
            <RawInput value={iValue ?? ""} onChange={(v) => onI?.(v)} width={36} />
          </div>
        </>
      )}
      <span
        className={`rounded-md py-0.5 text-center font-mono text-sm font-semibold ${finalCellClass(final)}`}
      >
        {final === null || final === undefined ? "—" : final}
      </span>
    </div>
  );
}

export function FmsSection({ clienteId, initialFms }: { clienteId: string; initialFms: FmsData }) {
  const [fms, setFms] = useState<FmsData>(initialFms);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const setPar = (key: ParKey, lado: "d" | "i", value: string) =>
    setFms((prev) => ({ ...prev, [key]: { ...prev[key], [lado]: value } }));

  const setClearingPar = (key: ClearingParKey, lado: LadoKey, value: boolean) =>
    setFms((prev) => ({
      ...prev,
      [key]: { ...(prev[key] as Record<string, boolean>), [lado]: value },
    }));

  const setSeguimiento = (key: string, texto: string) =>
    setFms((prev) => ({ ...prev, seguimientoPropio: { ...prev.seguimientoPropio, [key]: texto } }));

  const finales = calcularFinalesFms(fms);
  const total = totalFms(finales);

  const sugerencias = Object.entries(finales)
    .filter((entry): entry is [string, 0 | 1 | 2] => entry[1] === 0 || entry[1] === 1 || entry[1] === 2)
    .sort((a, b) => a[1] - b[1])
    .map(([key, score]) => ({ key, score, ...FMS_SUGERENCIAS[key] }));

  const guardar = () => {
    startTransition(async () => {
      await updateFms(clienteId, fms);
      setSavedAt(Date.now());
    });
  };

  return (
    <section className="grid grid-cols-2 gap-5">
      <div className="dp-surface rounded-2xl p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium dp-text-heading">Screening de movimiento · FMS</h2>
          <div className="text-right">
            <p className="dp-muted text-[10px] font-medium uppercase tracking-wide">Total score</p>
            <p className="font-mono text-xl font-semibold dp-text-heading">
              {total}
              <span className="dp-muted text-xs"> / 21</span>
            </p>
          </div>
        </div>

        <div
          className="dp-muted grid gap-1 pb-1 text-[10px] font-medium uppercase tracking-wide"
          style={{ gridTemplateColumns: "1.4fr 0.3fr 0.6fr 0.6fr" }}
        >
          <span>Movimiento</span>
          <span />
          <span>Raw</span>
          <span className="text-center">Final</span>
        </div>

        <FmsRow
          label="Sentadilla"
          single
          singleValue={fms.sentadilla}
          onSingle={(v) => setFms((prev) => ({ ...prev, sentadilla: v }))}
          final={finales.sentadilla}
        />
        <FmsRow
          label="Paso valla"
          dValue={fms.pasoValla.d}
          iValue={fms.pasoValla.i}
          onD={(v) => setPar("pasoValla", "d", v)}
          onI={(v) => setPar("pasoValla", "i", v)}
          final={finales.pasoValla}
        />
        <FmsRow
          label="Estocada"
          dValue={fms.estocada.d}
          iValue={fms.estocada.i}
          onD={(v) => setPar("estocada", "d", v)}
          onI={(v) => setPar("estocada", "i", v)}
          final={finales.estocada}
        />

        <div className="flex items-center justify-between border-b border-black/5 py-1.5">
          <span className="dp-muted text-xs">Clearing tobillo · dolor</span>
          <div className="flex gap-2">
            <ClearingToggle
              value={fms.clearingTobDolor?.d ?? false}
              onChange={(v) => setClearingPar("clearingTobDolor", "d", v)}
            />
            <ClearingToggle
              value={fms.clearingTobDolor?.i ?? false}
              onChange={(v) => setClearingPar("clearingTobDolor", "i", v)}
            />
          </div>
        </div>

        <FmsRow
          label="Movilidad de hombro"
          dValue={fms.hombro.d}
          iValue={fms.hombro.i}
          onD={(v) => setPar("hombro", "d", v)}
          onI={(v) => setPar("hombro", "i", v)}
          final={finales.hombro}
        />
        <div className="flex items-center justify-between border-b border-black/5 py-1.5">
          <span className="dp-muted text-xs">Clearing hombro</span>
          <div className="flex gap-2">
            <ClearingToggle
              value={fms.clearingHombro?.d ?? false}
              onChange={(v) => setClearingPar("clearingHombro", "d", v)}
            />
            <ClearingToggle
              value={fms.clearingHombro?.i ?? false}
              onChange={(v) => setClearingPar("clearingHombro", "i", v)}
            />
          </div>
        </div>

        <FmsRow
          label="ASLR"
          dValue={fms.aslr.d}
          iValue={fms.aslr.i}
          onD={(v) => setPar("aslr", "d", v)}
          onI={(v) => setPar("aslr", "i", v)}
          final={finales.aslr}
        />
        <FmsRow
          label="Push up"
          single
          singleValue={fms.pushUp}
          onSingle={(v) => setFms((prev) => ({ ...prev, pushUp: v }))}
          final={finales.pushUp}
        />
        <div className="flex items-center justify-between border-b border-black/5 py-1.5">
          <span className="dp-muted text-xs">Clearing extensión</span>
          <ClearingToggle
            value={fms.clearingExtension}
            onChange={(v) => setFms((prev) => ({ ...prev, clearingExtension: v }))}
          />
        </div>

        <FmsRow
          label="Estabilidad rotacional"
          dValue={fms.rotacion.d}
          iValue={fms.rotacion.i}
          onD={(v) => setPar("rotacion", "d", v)}
          onI={(v) => setPar("rotacion", "i", v)}
          final={finales.rotacion}
        />
        <div className="flex items-center justify-between border-b border-black/5 py-1.5">
          <span className="dp-muted text-xs">Clearing flexión</span>
          <ClearingToggle
            value={fms.clearingFlexion}
            onChange={(v) => setFms((prev) => ({ ...prev, clearingFlexion: v }))}
          />
        </div>

        <div className="flex items-center justify-between border-b border-black/5 py-1.5">
          <span className="dp-muted text-xs">Toe touch (cm)</span>
          <RawInput
            value={fms.toeTouch ?? ""}
            onChange={(v) => setFms((prev) => ({ ...prev, toeTouch: v }))}
            width={50}
          />
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="dp-muted text-xs">Clearing muñeca (der / izq)</span>
          <div className="flex gap-2">
            <ClearingToggle
              value={fms.clearingMuneca?.der ?? false}
              onChange={(v) => setClearingPar("clearingMuneca", "der", v)}
            />
            <ClearingToggle
              value={fms.clearingMuneca?.izq ?? false}
              onChange={(v) => setClearingPar("clearingMuneca", "izq", v)}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="dp-bg-brand rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar screening FMS"}
          </button>
          {savedAt && !pending && <span className="dp-muted text-xs">Guardado.</span>}
        </div>
      </div>

      <div className="dp-surface sticky top-5 h-fit rounded-2xl p-5 shadow-sm">
        <h2 className="mb-1 font-medium dp-text-heading">Sugerencias de evaluación</h2>
        <p className="dp-muted mb-4 text-xs">
          Se actualizan solas con puntajes 0, 1 o 2 — el 0 significa dolor y es lo más urgente, luego 1 y
          luego 2.
        </p>
        {sugerencias.length === 0 ? (
          <p className="dp-muted py-6 text-center text-sm">
            Sin puntajes de 0, 1 o 2 todavía. A medida que llenes el screening, aquí aparecerán los tests de
            seguimiento recomendados.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {sugerencias.map((s) => (
              <div key={s.key} className="dp-bg-faint rounded-xl p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-xs font-semibold text-white ${
                      s.score <= 1 ? "dp-bg-alert" : "dp-bg-amber"
                    }`}
                  >
                    {s.score}
                  </span>
                  <span className="text-sm font-medium dp-text-heading">{s.label}</span>
                </div>
                <p className="dp-body text-xs leading-relaxed">{s[s.score]}</p>
                <div className="mt-2">
                  <label className="dp-muted text-[10px] font-medium uppercase tracking-wide">
                    Tu seguimiento (criterio propio)
                  </label>
                  <input
                    value={fms.seguimientoPropio?.[s.key] || ""}
                    onChange={(e) => setSeguimiento(s.key, e.target.value)}
                    placeholder="Ej: test de knee-to-wall, up and go, etc."
                    className="mt-0.5 w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs outline-none focus:dp-border-brand"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
