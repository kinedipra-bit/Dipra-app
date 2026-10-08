"use client";

import { useMemo, useState, useTransition } from "react";
import { ejerciciosDesdeDia } from "@/lib/dipra/agruparEjercicios";
import type { DiaPlan } from "@/lib/dipra/types";
import { crearSesionGrupal } from "../actions";

// Registra que la clase grupal se hizo: crea una Sesion por cada asistente
// (misma tabla que usa Sesiones individual), copiando los ejercicios del
// día elegido de la planificación grupal — así queda registrado en la
// ficha de cada persona, igual que una sesión individual.
export function SesionGrupalForm({
  grupoId,
  miembros,
  diasPlan,
}: {
  grupoId: string;
  miembros: { id: string; nombre: string }[];
  diasPlan: DiaPlan[];
}) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [diaLabel, setDiaLabel] = useState("");
  const [asistentes, setAsistentes] = useState<string[]>(miembros.map((m) => m.id));
  const [comentarios, setComentarios] = useState("");
  const [pending, startTransition] = useTransition();
  const [guardadoAt, setGuardadoAt] = useState<number | null>(null);

  const dia = diasPlan.find((d) => d.label === diaLabel);
  const ejercicios = useMemo(() => (dia ? ejerciciosDesdeDia(dia) : []), [dia]);

  const toggleAsistente = (id: string) => {
    setAsistentes((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const registrar = () => {
    if (!diaLabel || asistentes.length === 0) return;
    startTransition(async () => {
      await crearSesionGrupal({
        grupoId,
        asistentes,
        fecha,
        diaPlanLabel: diaLabel,
        ejercicios,
        comentarios: comentarios.trim(),
      });
      setComentarios("");
      setGuardadoAt(Date.now());
    });
  };

  if (miembros.length === 0) {
    return (
      <p className="dp-muted dp-surface rounded-2xl p-8 text-center text-sm shadow-sm">
        Este grupo todavía no tiene miembros — agregalos en la pestaña &quot;Miembros&quot;.
      </p>
    );
  }

  return (
    <div className="dp-surface flex flex-col gap-4 rounded-2xl p-5 shadow-sm">
      <p className="dp-muted text-xs">
        Deja registrado que la clase se hizo: cada persona marcada como asistente recibe esta sesión en su
        propia ficha (pestaña Sesiones), con los ejercicios del día elegido.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Fecha</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-mono outline-none focus:dp-border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Día del plan</span>
          <select
            value={diaLabel}
            onChange={(e) => setDiaLabel(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
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

      {diaLabel && (
        <div>
          <p className="dp-muted mb-1 text-[11px] font-medium uppercase tracking-wide">
            Se va a registrar en cada asistente
          </p>
          {ejercicios.length === 0 ? (
            <p className="dp-muted text-xs">Este día no tiene ejercicios cargados en la planificación todavía.</p>
          ) : (
            <p className="dp-body text-xs leading-relaxed">{ejercicios.map((e) => e.nombre).join(" · ")}</p>
          )}
        </div>
      )}

      <div>
        <p className="dp-body mb-1.5 text-sm font-medium">¿Quién asistió?</p>
        <div className="flex flex-wrap gap-2">
          {miembros.map((m) => {
            const asistio = asistentes.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleAsistente(m.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  asistio ? "dp-bg-brand text-white" : "dp-bg-faint dp-muted line-through"
                }`}
              >
                {m.nombre}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="dp-body font-medium">Comentarios de la clase (opcional)</span>
        <textarea
          rows={2}
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          placeholder="Ej: grupo rindió bien, bajamos intensidad por calor, etc."
          className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={registrar}
          disabled={!diaLabel || asistentes.length === 0 || pending}
          className="dp-bg-brand w-fit rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Registrando…" : "Registrar sesión grupal"}
        </button>
        {guardadoAt && !pending && (
          <span className="dp-muted text-xs">Guardado en la ficha de cada asistente.</span>
        )}
      </div>
    </div>
  );
}
