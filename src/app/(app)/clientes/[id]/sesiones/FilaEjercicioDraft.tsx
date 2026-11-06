"use client";

import type { EjercicioSesion } from "@/lib/dipra/types";
import { esYoutubeVertical, normalizeLink, youtubeEmbedUrl } from "@/lib/youtube";

const gridSets = { gridTemplateColumns: "1.5rem 1fr 1fr 1fr 1.25rem" };

function conIndice(
  arr: (number | string)[] | undefined,
  largo: number,
  fallback: (i: number) => number | string
): (number | string)[] {
  return Array.from({ length: largo }, (_, i) => arr?.[i] ?? fallback(i));
}

// Cuántas series tiene hoy el ejercicio — ya no es un número que el
// profesional escribe aparte (ver "Ser." en el diseño anterior), sino el
// largo real de las filas de serie que se ven en pantalla. seriesReal se
// mantiene en sync con esto para que volumenEjercicioSesion (ver calc.ts)
// siga sumando bien.
export function setsDeEjercicio(ex: EjercicioSesion): number {
  return Math.max(
    ex.repsSeriesReal?.length ?? 0,
    ex.pesosSeriesReal?.length ?? 0,
    ex.rpeSeries?.length ?? 0,
    Number(ex.seriesReal) || 0,
    1
  );
}

export function FilaEjercicioDraft({
  ex,
  idx,
  nombreEditando,
  onAbrirEdicionNombre,
  onCerrarEdicionNombre,
  videoAbierto,
  onToggleVideo,
  onUpdate,
  onRemove,
}: {
  ex: EjercicioSesion;
  idx: number;
  nombreEditando: boolean;
  onAbrirEdicionNombre: () => void;
  onCerrarEdicionNombre: () => void;
  videoAbierto: boolean;
  onToggleVideo: () => void;
  onUpdate: (idx: number, patch: Partial<EjercicioSesion>) => void;
  onRemove: (idx: number) => void;
}) {
  const sets = setsDeEjercicio(ex);
  const pesosPlan = (ex.pesosSeriesPlan ?? []).filter((p) => Number(p) > 0);
  const kgPlanTexto = pesosPlan.length > 0 ? pesosPlan.map((p) => Number(p) || 0).join("/") : String(ex.kgPlan);
  const embedUrl = youtubeEmbedUrl(ex.link ?? "");

  const cambiarReps = (i: number, value: string) => {
    const largo = Math.max(sets, i + 1);
    const current = conIndice(ex.repsSeriesReal, largo, () => ex.repsReal);
    current[i] = value === "" ? "" : Number(value);
    onUpdate(idx, { repsSeriesReal: current, seriesReal: largo });
  };
  const cambiarKg = (i: number, value: string) => {
    const largo = Math.max(sets, i + 1);
    const current = conIndice(ex.pesosSeriesReal, largo, () => ex.kgReal);
    current[i] = value === "" ? "" : Number(value);
    onUpdate(idx, { pesosSeriesReal: current, seriesReal: largo });
  };
  const cambiarRpe = (i: number, value: string) => {
    const largo = Math.max(sets, i + 1);
    const current = conIndice(ex.rpeSeries, largo, () => "");
    current[i] = value;
    onUpdate(idx, { rpeSeries: current, seriesReal: largo });
  };

  const agregarSerie = () => {
    const largo = sets + 1;
    onUpdate(idx, {
      repsSeriesReal: conIndice(ex.repsSeriesReal, largo, () => ex.repsReal),
      pesosSeriesReal: conIndice(ex.pesosSeriesReal, largo, () => ex.kgReal),
      rpeSeries: conIndice(ex.rpeSeries, largo, () => ""),
      seriesReal: largo,
    });
  };

  const quitarSerie = (i: number) => {
    if (sets <= 1) return;
    const largo = sets - 1;
    onUpdate(idx, {
      repsSeriesReal: conIndice(ex.repsSeriesReal, sets, () => ex.repsReal).filter((_, j) => j !== i),
      pesosSeriesReal: conIndice(ex.pesosSeriesReal, sets, () => ex.kgReal).filter((_, j) => j !== i),
      rpeSeries: conIndice(ex.rpeSeries, sets, () => "").filter((_, j) => j !== i),
      seriesReal: largo,
    });
  };

  return (
    <div className="dp-bg-faint rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {nombreEditando || !ex.nombre ? (
              <input
                value={ex.nombre}
                onChange={(e) => onUpdate(idx, { nombre: e.target.value })}
                onBlur={onCerrarEdicionNombre}
                list="sesiones-biblioteca-datalist"
                placeholder="Nombre del ejercicio…"
                autoFocus
                className="w-full rounded-md border border-black/10 px-1.5 py-0.5 text-sm outline-none focus:dp-border-brand"
              />
            ) : (
              <>
                {embedUrl ? (
                  <button
                    type="button"
                    onClick={onToggleVideo}
                    className="dp-text-brand flex min-w-0 items-center gap-1 truncate text-left text-sm underline decoration-dotted"
                  >
                    <span aria-hidden>▶</span> {ex.nombre}
                  </button>
                ) : ex.link ? (
                  <a
                    href={normalizeLink(ex.link)}
                    target="_blank"
                    rel="noreferrer"
                    className="dp-text-brand min-w-0 truncate text-sm underline"
                  >
                    {ex.nombre}
                  </a>
                ) : (
                  <span className="dp-text-heading min-w-0 truncate text-sm">{ex.nombre}</span>
                )}
                <button
                  type="button"
                  onClick={onAbrirEdicionNombre}
                  title="Editar nombre"
                  className="dp-muted shrink-0 text-xs hover:dp-text-brand"
                >
                  ✎
                </button>
              </>
            )}
          </div>
          <p className="dp-muted font-mono text-xs">
            plan {ex.seriesPlan}×{ex.repsPlan}
            {ex.unilateral ? " c/u" : ""}×{kgPlanTexto}kg{ex.pesoCadaUno ? " c/u" : ""}
            {(ex.tipoCarga || ex.tiempoSerie) && ` · ${[ex.tipoCarga, ex.tiempoSerie].filter(Boolean).join(" · ")}`}
          </p>
          {ex.notaReps && (
            <span className="dp-bg-amber-soft dp-text-amber mt-1 block w-fit rounded-md px-1.5 py-0.5 text-[10px]">
              {ex.notaReps}
            </span>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1 select-none">
              <input
                type="checkbox"
                checked={!!ex.unilateral}
                onChange={(e) => onUpdate(idx, { unilateral: e.target.checked })}
                className="h-3 w-3"
              />
              <span className="dp-muted text-[10px] font-medium">Unilateral (reps c/u)</span>
            </label>
            <label
              className="flex cursor-pointer items-center gap-1 select-none"
              title="Ej. dos mancuernas de 7,5 kg cada una — el volumen se calcula duplicando el kg cargado"
            >
              <input
                type="checkbox"
                checked={!!ex.pesoCadaUno}
                onChange={(e) => onUpdate(idx, { pesoCadaUno: e.target.checked })}
                className="h-3 w-3"
              />
              <span className="dp-muted text-[10px] font-medium">Peso c/u (2 mancuernas)</span>
            </label>
          </div>
        </div>
        <button type="button" onClick={() => onRemove(idx)} className="dp-muted hover:dp-alert shrink-0 text-xs">
          ✕
        </button>
      </div>

      {videoAbierto && embedUrl && (
        <div
          className={`mt-2 overflow-hidden rounded-lg ${
            esYoutubeVertical(ex.link ?? "") ? "aspect-[9/16] w-full max-w-[280px]" : "aspect-video w-full"
          }`}
        >
          <iframe
            src={embedUrl}
            title={`Video de ${ex.nombre}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      )}

      <div className="mt-2 flex flex-col gap-1">
        <div className="dp-muted grid gap-2 text-[10px] font-medium uppercase tracking-wide" style={gridSets}>
          <span>Serie</span>
          <span>Reps{ex.unilateral && " c/u"}</span>
          <span>Kg{ex.pesoCadaUno && " c/u"}</span>
          <span>RPE</span>
          <span />
        </div>
        {Array.from({ length: sets }).map((_, i) => (
          <div key={i} className="grid items-center gap-2" style={gridSets}>
            <span className="dp-muted font-mono text-xs">{i + 1}</span>
            <input
              type="number"
              value={ex.repsSeriesReal?.[i] ?? ex.repsReal}
              onChange={(e) => cambiarReps(i, e.target.value)}
              className="rounded-md border border-black/10 bg-white px-1 py-0.5 text-center font-mono text-xs outline-none focus:dp-border-brand"
            />
            <input
              type="number"
              value={ex.pesosSeriesReal?.[i] ?? ex.kgReal}
              onChange={(e) => cambiarKg(i, e.target.value)}
              className="rounded-md border border-black/10 bg-white px-1 py-0.5 text-center font-mono text-xs outline-none focus:dp-border-brand"
            />
            <input
              type="number"
              min={0}
              max={10}
              value={ex.rpeSeries?.[i] ?? ""}
              onChange={(e) => cambiarRpe(i, e.target.value)}
              placeholder="—"
              className="rounded-md border border-black/10 bg-white px-1 py-0.5 text-center font-mono text-xs outline-none focus:dp-border-brand"
            />
            <button
              type="button"
              onClick={() => quitarSerie(i)}
              disabled={sets <= 1}
              title="Quitar esta serie"
              className="dp-muted hover:dp-alert text-xs disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={agregarSerie} className="dp-text-brand mt-0.5 w-fit text-xs font-medium hover:underline">
          + Serie
        </button>
      </div>

      <input
        value={ex.comentario ?? ""}
        onChange={(e) => onUpdate(idx, { comentario: e.target.value })}
        placeholder="Nota de este ejercicio hoy — ej: tomada neutra, cambié a mancuernas…"
        className="mt-2 w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs outline-none focus:dp-border-brand"
      />
    </div>
  );
}
