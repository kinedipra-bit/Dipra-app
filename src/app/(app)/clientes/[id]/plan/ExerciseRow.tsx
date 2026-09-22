"use client";

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
 * portal del atleta (otro agente/orquestador) va a poder reusar este mismo
 * componente pasando readOnly=true (todo de solo lectura salvo que
 * allowClientComment=true habilite el campo de comentario del atleta) sin
 * reescribirlo.
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
  const volumen = (Number(ex.series) || 0) * (Number(ex.reps) || 0) * (Number(ex.kg) || 0);

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

  const campoInputClass =
    "font-mono text-xs border border-black/10 rounded-md px-1 py-0.5 outline-none focus:dp-border-brand text-center";

  return (
    <div className="py-1.5">
      <div className="grid items-center gap-2" style={{ gridTemplateColumns: "1.6fr 0.55fr 0.55fr 0.6fr 0.7fr auto" }}>
        {readOnly ? (
          <a
            href={ex.link || undefined}
            target="_blank"
            rel="noreferrer"
            className={`truncate text-sm ${ex.link ? "dp-text-brand underline" : "dp-ink"}`}
          >
            {ex.nombre}
          </a>
        ) : (
          <input
            value={ex.nombre}
            onChange={(e) => handleNombreChange(e.target.value)}
            list={datalistId}
            placeholder="Ejercicio (sugiere desde la biblioteca)"
            className="rounded-lg border border-black/10 px-2 py-1 text-sm outline-none focus:dp-border-brand"
          />
        )}
        {(["series", "reps", "kg"] as const).map((k) =>
          readOnly ? (
            <span key={k} className="dp-body text-center font-mono text-sm">
              {ex[k]}
            </span>
          ) : (
            <input
              key={k}
              type="number"
              value={ex[k]}
              onChange={(e) => onChange({ ...ex, [k]: Number(e.target.value) })}
              className="rounded-lg border border-black/10 px-2 py-1 text-center font-mono text-sm outline-none focus:dp-border-brand"
            />
          )
        )}
        <span className="dp-muted text-right font-mono text-xs">{volumen.toLocaleString("es-CL")} kg</span>
        {!readOnly && (
          <button type="button" onClick={onRemove} className="dp-muted hover:dp-alert text-sm">
            ✕
          </button>
        )}
      </div>

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
