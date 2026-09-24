"use client";

import { useEffect, useState, useTransition } from "react";
import { PILARES_KEYS, emptySesionPilares } from "@/lib/dipra/constants";
import { EscalaUnoADiez } from "@/app/(app)/clientes/[id]/sesiones/EscalaUnoADiez";
import { crearSesionPortal } from "./actions";

function pilarInvertido(p: (typeof PILARES_KEYS)[number]): boolean {
  return "invertido" in p && p.invertido === true;
}

type Draft = {
  diaPlanLabel: string;
  pilares: ReturnType<typeof emptySesionPilares>;
  comentarios: string;
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

export function PortalNuevaSesionForm({ token, diasLabels }: { token: string; diasLabels: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const [diaPlanLabel, setDiaPlanLabel] = useState(diasLabels[0] ?? "");
  const [pilares, setPilares] = useState(emptySesionPilares());
  const [comentarios, setComentarios] = useState("");
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
    const draft = leerDraft(token);
    if (draft) {
      setDiaPlanLabel(draft.diaPlanLabel || diasLabels[0] || "");
      setPilares(draft.pilares);
      setComentarios(draft.comentarios);
      setAbierto(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Respalda cada cambio mientras el formulario está abierto.
  useEffect(() => {
    if (!abierto) return;
    guardarDraft(token, { diaPlanLabel, pilares, comentarios });
  }, [token, abierto, diaPlanLabel, pilares, comentarios]);

  const enviar = () => {
    setError(null);
    startTransition(async () => {
      try {
        await crearSesionPortal(token, {
          fecha: new Date().toISOString().slice(0, 10),
          dia_plan_label: diaPlanLabel,
          pilares,
          comentarios,
        });
        borrarDraft(token);
        setPilares(emptySesionPilares());
        setComentarios("");
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

  if (!abierto) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
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

      {diasLabels.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">¿Qué día hiciste?</span>
          <select
            value={diaPlanLabel}
            onChange={(e) => setDiaPlanLabel(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
          >
            {diasLabels.map((label) => (
              <option key={label} value={label}>
                {label}
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
              value={pilares[p.key]}
              onChange={(v) => setPilares((prev) => ({ ...prev, [p.key]: v }))}
              invertido={pilarInvertido(p)}
            />
          </div>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="dp-body font-medium">Observaciones (opcional)</span>
        <textarea
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
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
