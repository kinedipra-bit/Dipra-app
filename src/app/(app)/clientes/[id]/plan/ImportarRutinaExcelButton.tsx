"use client";

import { useRef, useState, useTransition } from "react";
import type { PlanSemana } from "@/lib/dipra/types";
import { importarRutinaDesdeExcel } from "./actions";

export function ImportarRutinaExcelButton({
  clienteId,
  onImportado,
}: {
  clienteId: string;
  onImportado: (semanas: PlanSemana[], semanaActivaId: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cerrar = () => {
    setAbierto(false);
    setArchivo(null);
    setError(null);
    setResultado(null);
  };

  const importar = () => {
    if (!archivo) return;
    setError(null);
    setResultado(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("archivo", archivo);
        const r = await importarRutinaDesdeExcel(clienteId, formData);
        if (r.semanas.length === 0) return;
        onImportado(r.semanas, r.semanas[r.semanas.length - 1].id);
        setResultado(
          `Listo — ${r.semanas.length} semana${r.semanas.length === 1 ? "" : "s"}, ${r.diasCreados} día${
            r.diasCreados === 1 ? "" : "s"
          } y ${r.ejerciciosCreados} ejercicios. Quedaron sin compartir — revisalas antes de compartir.`
        );
        setArchivo(null);
        if (inputRef.current) inputRef.current.value = "";
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo importar el archivo.");
      }
    });
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium"
      >
        Importar rutina desde Excel
      </button>
    );
  }

  return (
    <div className="dp-bg-faint flex flex-col gap-2 rounded-xl p-3">
      <p className="dp-muted text-xs">
        Subí el Excel de la rutina (misma planilla de siempre, hoja &quot;Plani&quot;) — arma las semanas y
        días con sus bloques y ejercicios como borrador, sin compartirlas todavía.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className="text-xs"
        />
        <button
          type="button"
          onClick={importar}
          disabled={!archivo || pending}
          className="dp-bg-brand rounded-lg px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {pending ? "Importando…" : "Importar"}
        </button>
        <button type="button" onClick={cerrar} className="dp-muted text-xs hover:underline">
          Cancelar
        </button>
      </div>
      {error && <p className="dp-alert text-xs">{error}</p>}
      {resultado && <p className="dp-text-brand text-xs">{resultado}</p>}
    </div>
  );
}
