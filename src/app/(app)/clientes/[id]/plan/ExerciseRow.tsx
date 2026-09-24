"use client";

import { useState } from "react";
import { volumenEjercicio } from "@/lib/dipra/calc";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { EjercicioPlan, EjercicioBiblioteca } from "@/lib/dipra/types";

const CAMPOS: { key: "rpe" | "rir" | "tut" | "descanso"; label: string; width?: number }[] = [
  { key: "rpe", label: "RPE" },
  { key: "rir", label: "RIR" },
  { key: "tut", label: "TUT" },
  { key: "descanso", label: "Desc.", width: 56 },
];

/**
 * Fila de ejercicio editable, migrada desde ExerciseRow (dipra-app.jsx
 * líneas 1129-1239).
 *
 * `readOnly` / `allowClientComment` quedan cableados desde ya aunque hoy
 * esta pestaña siempre se usa en modo profesional (ambos en false): el
 * portal del atleta reusa este mismo componente pasando
 * readOnly=true (todo de solo lectura salvo que allowClientComment=true
 * habilite el campo de comentario del atleta) sin reescribirlo.
 *
 * Campos de carga extendidos (pesosSeries / tiempoSerie / tipoCarga /
 * unilateral) se muestran tanto en modo edición (inputs) como en modo
 * readOnly (texto/badges) — ver AGENTS.md del módulo de plan.
 */
export function ExerciseRow({
  ex,
  onChange,
  onRemove,
  biblioteca = [],
  onSaveToBiblioteca,
  readOnly = false,
  allowClientComment = false,
  datalistId = "biblioteca-datalist",
}: {
  ex: EjercicioPlan;
  onChange: (next: EjercicioPlan) => void;
  onRemove: () => void;
  biblioteca?: EjercicioBiblioteca[];
  onSaveToBiblioteca?: (ex: { nombre: string; link: string }) => void;
  readOnly?: boolean;
  allowClientComment?: boolean;
  datalistId?: string;
}) {
  const volumen = volumenEjercicio(ex);
  const seriesCount = Number(ex.series) || 0;
  const pesosSeriesActivo = (ex.pesosSeries ?? []).some((p) => Number(p) > 0);

  // El toggle "peso por serie" arranca abierto si el ejercicio ya trae
  // valores cargados en pesosSeries (ej. al reabrir un plan guardado).
  const [pesoPorSerieAbierto, setPesoPorSerieAbierto] = useState(pesosSeriesActivo);
  const [videoAbierto, setVideoAbierto] = useState(false);
  const embedUrl = youtubeEmbedUrl(ex.link);

  // Autocompletado contra la biblioteca: si el nombre tipeado matchea
  // (case-insensitive) un ejercicio de la biblioteca y el ejercicio del plan
  // todavía no tiene link propio, se copia el link de la biblioteca.
  const handleNombreChange = (nombre: string) => {
    const match = biblioteca.find((b) => b.nombre.toLowerCase() === nombre.toLowerCase());
    if (match && !ex.link) {
      onChange({ ...ex, nombre, link: match.link });
    } else {
      onChange({ ...ex, nombre });
    }
  };

  const yaEnBiblioteca = biblioteca.some((b) => b.nombre.toLowerCase() === (ex.nombre || "").toLowerCase());
  const puedeGuardar = !readOnly && !!ex.nombre?.trim() && !!ex.link?.trim() && !yaEnBiblioteca;

  const buscarEnYoutube = () => {
    const q = encodeURIComponent(`${ex.nombre} ejercicio tecnica`);
    window.open(`https://www.youtube.com/results?search_query=${q}`, "_blank", "noopener,noreferrer");
  };

  // Activa el modo "peso por serie": prellena un array de largo `series`
  // usando los valores de pesosSeries ya guardados (si hay) y, para el
  // resto, el valor uniforme de `kg` como default.
  const togglePesoPorSerie = () => {
    if (pesoPorSerieAbierto) {
      setPesoPorSerieAbierto(false);
      return;
    }
    const base = ex.pesosSeries ?? [];
    const next = Array.from({ length: Math.max(seriesCount, 1) }, (_, i) => base[i] ?? ex.kg ?? 0);
    onChange({ ...ex, pesosSeries: next });
    setPesoPorSerieAbierto(true);
  };

  const handlePesoSerieChange = (i: number, value: string) => {
    const current = Array.from({ length: seriesCount }, (_, idx) => ex.pesosSeries?.[idx] ?? ex.kg ?? 0);
    current[i] = value === "" ? "" : Number(value);
    onChange({ ...ex, pesosSeries: current });
  };

  const campoInputClass =
    "font-mono text-xs border border-black/10 rounded-md px-1 py-0.5 outline-none focus:dp-border-brand text-center";

  const kgTexto = pesosSeriesActivo
    ? (ex.pesosSeries ?? []).map((p) => Number(p) || 0).join("/")
    : String(ex.kg ?? 0);

  return (
    <div className="py-1.5">
      <div className="grid items-center gap-2" style={{ gridTemplateColumns: "1.5fr 0.5fr 0.75fr 0.6fr 0.7fr auto" }}>
        {readOnly ? (
          embedUrl ? (
            <button
              type="button"
              onClick={() => setVideoAbierto((v) => !v)}
              className="dp-text-brand flex items-center gap-1 truncate text-left text-sm underline decoration-dotted"
            >
              <span aria-hidden>▶</span> {ex.nombre}
            </button>
          ) : ex.link ? (
            <a
              href={ex.link}
              target="_blank"
              rel="noreferrer"
              className="dp-text-brand truncate text-sm underline"
            >
              {ex.nombre}
            </a>
          ) : (
            <span className="dp-ink truncate text-sm">{ex.nombre}</span>
          )
        ) : (
          <input
            value={ex.nombre}
            onChange={(e) => handleNombreChange(e.target.value)}
            list={datalistId}
            placeholder="Ejercicio (sugiere desde la biblioteca)"
            className="rounded-lg border border-black/10 px-2 py-1 text-sm outline-none focus:dp-border-brand"
          />
        )}

        {/* Series */}
        {readOnly ? (
          <span className="dp-body text-center font-mono text-sm">{ex.series}</span>
        ) : (
          <input
            type="number"
            value={ex.series}
            onChange={(e) => onChange({ ...ex, series: Number(e.target.value) })}
            className="rounded-lg border border-black/10 px-2 py-1 text-center font-mono text-sm outline-none focus:dp-border-brand"
          />
        )}

        {/* Reps (+ badge "c/u" si es unilateral) */}
        {readOnly ? (
          <span className="dp-body flex items-center justify-center gap-1 text-center font-mono text-sm">
            {ex.reps}
            {ex.unilateral && <span className="dp-text-brand text-[10px] font-semibold">c/u</span>}
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={ex.reps}
              onChange={(e) => onChange({ ...ex, reps: Number(e.target.value) })}
              style={{ minWidth: 40 }}
              className="flex-1 rounded-lg border border-black/10 px-2 py-1 text-center font-mono text-sm outline-none focus:dp-border-brand"
            />
            {ex.unilateral && <span className="dp-text-brand shrink-0 text-[10px] font-semibold">c/u</span>}
          </div>
        )}

        {/* Kg (uniforme, o texto "12/14/16" si hay peso por serie cargado; + badge "c/u" si es peso por implemento) */}
        {readOnly ? (
          <span className="dp-body flex items-center justify-center gap-1 text-center font-mono text-sm">
            {kgTexto}
            {ex.pesoCadaUno && <span className="dp-text-brand text-[10px] font-semibold">c/u</span>}
          </span>
        ) : pesoPorSerieAbierto ? (
          <span
            className="dp-muted flex items-center justify-center gap-1 text-center font-mono text-xs"
            title="Editando peso por serie más abajo"
          >
            por serie
            {ex.pesoCadaUno && <span className="dp-text-brand text-[10px] font-semibold">c/u</span>}
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={ex.kg}
              onChange={(e) => onChange({ ...ex, kg: Number(e.target.value) })}
              style={{ minWidth: 40 }}
              className="flex-1 rounded-lg border border-black/10 px-2 py-1 text-center font-mono text-sm outline-none focus:dp-border-brand"
            />
            {ex.pesoCadaUno && <span className="dp-text-brand shrink-0 text-[10px] font-semibold">c/u</span>}
          </div>
        )}

        <span className="dp-muted text-right font-mono text-xs">{volumen.toLocaleString("es-CL")} kg</span>
        {!readOnly && (
          <button type="button" onClick={onRemove} className="dp-muted hover:dp-alert text-sm">
            ✕
          </button>
        )}
      </div>

      {videoAbierto && embedUrl && (
        <div className="mt-2 aspect-video w-full max-w-md overflow-hidden rounded-lg">
          <iframe
            src={embedUrl}
            title={`Video de ${ex.nombre}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      )}

      {/* Carga extendida: tipo de carga no numérica, tiempo, unilateral y toggle de peso por serie */}
      {!readOnly && (
        <div className="mt-1 flex flex-wrap items-center gap-3 pl-0.5">
          <div className="flex items-center gap-1">
            <span className="dp-muted text-[10px] font-medium">Carga</span>
            <input
              value={ex.tipoCarga || ""}
              onChange={(e) => onChange({ ...ex, tipoCarga: e.target.value })}
              placeholder="Ej. peso corporal…"
              style={{ width: 110 }}
              className={campoInputClass}
            />
            {["Banda", "Peso corporal"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ ...ex, tipoCarga: ex.tipoCarga === preset ? "" : preset })}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  ex.tipoCarga === preset ? "dp-bg-brand text-white" : "dp-bg-faint dp-body"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="dp-muted text-[10px] font-medium">Tiempo</span>
            <input
              value={ex.tiempoSerie || ""}
              onChange={(e) => onChange({ ...ex, tiempoSerie: e.target.value })}
              placeholder="30 seg"
              style={{ width: 64 }}
              className={campoInputClass}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-1 select-none">
            <input
              type="checkbox"
              checked={!!ex.unilateral}
              onChange={(e) => onChange({ ...ex, unilateral: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="dp-muted text-[10px] font-medium">Unilateral (reps c/u)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-1 select-none" title="Ej. dos mancuernas de 7,5 kg cada una — el volumen se calcula duplicando el kg cargado">
            <input
              type="checkbox"
              checked={!!ex.pesoCadaUno}
              onChange={(e) => onChange({ ...ex, pesoCadaUno: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="dp-muted text-[10px] font-medium">Peso c/u (2 mancuernas)</span>
          </label>
          {seriesCount > 1 && (
            <button
              type="button"
              onClick={togglePesoPorSerie}
              className="dp-text-brand text-[11px] font-medium hover:underline"
            >
              {pesoPorSerieAbierto ? "− Peso uniforme" : "+ Peso por serie"}
            </button>
          )}
        </div>
      )}

      {/* Inputs de peso por serie individual */}
      {!readOnly && pesoPorSerieAbierto && seriesCount > 0 && (
        <div className="dp-bg-faint mt-1 ml-0.5 flex flex-wrap items-center gap-2 rounded-lg px-2 py-1">
          {Array.from({ length: seriesCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="dp-muted text-[10px] font-medium">S{i + 1}</span>
              <input
                type="number"
                value={ex.pesosSeries?.[i] ?? ex.kg ?? 0}
                onChange={(e) => handlePesoSerieChange(i, e.target.value)}
                style={{ width: 48 }}
                className={campoInputClass}
              />
            </div>
          ))}
        </div>
      )}

      {/* Badges de solo lectura para tipo de carga / tiempo (unilateral ya se ve junto a reps) */}
      {readOnly && (ex.tipoCarga || ex.tiempoSerie) && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-0.5">
          {ex.tipoCarga && (
            <span className="dp-bg-faint dp-body rounded-full px-2 py-0.5 text-[10px] font-medium">
              {ex.tipoCarga}
            </span>
          )}
          {ex.tiempoSerie && (
            <span className="dp-bg-faint dp-body rounded-full px-2 py-0.5 text-[10px] font-medium">
              ⏱ {ex.tiempoSerie}
            </span>
          )}
        </div>
      )}

      <div className="mt-1 flex items-center gap-3 pl-0.5">
        {CAMPOS.map(({ key, label, width }) => (
          <div key={key} className="flex items-center gap-1">
            <span className="dp-muted text-[10px] font-medium">{label}</span>
            {readOnly ? (
              <span className="dp-body font-mono text-xs">{ex[key] || "—"}</span>
            ) : (
              <input
                value={ex[key] || ""}
                onChange={(e) => onChange({ ...ex, [key]: e.target.value })}
                style={{ width: width ?? 44 }}
                className={campoInputClass}
              />
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-1 flex items-center gap-1.5 pl-0.5">
          <input
            value={ex.link || ""}
            onChange={(e) => onChange({ ...ex, link: e.target.value })}
            placeholder="Pega aquí el link del video (o búscalo en YouTube →)"
            className="dp-muted flex-1 border-none bg-transparent text-xs outline-none"
          />
          <button
            type="button"
            onClick={buscarEnYoutube}
            className="dp-text-brand shrink-0 whitespace-nowrap text-[11px] font-medium hover:underline"
          >
            Buscar en YouTube
          </button>
          {embedUrl && (
            <button
              type="button"
              onClick={() => setVideoAbierto((v) => !v)}
              className="dp-text-amber shrink-0 whitespace-nowrap text-[11px] font-medium hover:underline"
            >
              {videoAbierto ? "Ocultar vista previa" : "▶ Vista previa"}
            </button>
          )}
          {puedeGuardar && onSaveToBiblioteca && (
            <button
              type="button"
              onClick={() => onSaveToBiblioteca({ nombre: ex.nombre.trim(), link: ex.link.trim() })}
              className="dp-text-amber shrink-0 whitespace-nowrap text-[11px] font-medium hover:underline"
            >
              + Guardar en biblioteca
            </button>
          )}
        </div>
      )}

      {allowClientComment ? (
        <div className="dp-bg-faint mt-1 ml-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1">
          <input
            value={ex.comentarioCliente || ""}
            onChange={(e) => onChange({ ...ex, comentarioCliente: e.target.value })}
            placeholder="Deja tu comentario — ej: no pude con 35, tiré 30 / me salieron 7 reps"
            className="dp-ink flex-1 border-none bg-transparent text-xs outline-none"
          />
        </div>
      ) : (
        readOnly &&
        ex.comentarioCliente && (
          <div className="dp-bg-faint mt-1 ml-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1">
            <span className="dp-ink flex-1 text-xs">{ex.comentarioCliente}</span>
          </div>
        )
      )}
    </div>
  );
}
