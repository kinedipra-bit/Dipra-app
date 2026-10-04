"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { EjercicioBiblioteca, Grupo, GrupoPlanSemana } from "@/lib/dipra/types";
import { actualizarMiembros, eliminarGrupo, renombrarGrupo } from "../actions";
import { GrupoPlanView } from "./GrupoPlanView";
import { EvaluacionGrupalForm } from "./EvaluacionGrupalForm";

const CUPO_MAXIMO = 8;

type Tab = "plan" | "evaluacion" | "miembros";

export function GrupoView({
  grupo,
  miembrosIniciales,
  todosLosClientes,
  semanasIniciales,
  bibliotecaInicial,
}: {
  grupo: Grupo;
  miembrosIniciales: { id: string; nombre: string }[];
  todosLosClientes: { id: string; nombre: string }[];
  semanasIniciales: GrupoPlanSemana[];
  bibliotecaInicial: EjercicioBiblioteca[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("plan");
  const [nombre, setNombre] = useState(grupo.nombre);
  const [miembros, setMiembros] = useState(miembrosIniciales);
  const [guardandoNombre, startGuardarNombre] = useTransition();
  const [guardandoMiembros, startGuardarMiembros] = useTransition();
  const [eliminando, startEliminar] = useTransition();

  const guardarNombre = () => {
    if (!nombre.trim()) return;
    startGuardarNombre(() => renombrarGrupo(grupo.id, nombre.trim()));
  };

  const toggleMiembro = (c: { id: string; nombre: string }) => {
    const yaEsta = miembros.some((m) => m.id === c.id);
    const next = yaEsta
      ? miembros.filter((m) => m.id !== c.id)
      : miembros.length < CUPO_MAXIMO
        ? [...miembros, c]
        : miembros;
    setMiembros(next);
    startGuardarMiembros(() => actualizarMiembros(grupo.id, next.map((m) => m.id)));
  };

  const borrarGrupo = () => {
    if (!window.confirm(`¿Eliminar el grupo "${grupo.nombre}"? Esta acción no se puede deshacer.`)) return;
    startEliminar(async () => {
      await eliminarGrupo(grupo.id);
      router.push("/grupos");
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link href="/grupos" className="dp-muted text-sm hover:dp-text-brand">
          ← Grupos
        </Link>
        <button
          type="button"
          onClick={borrarGrupo}
          disabled={eliminando}
          className="dp-alert text-xs hover:underline disabled:opacity-50"
        >
          Eliminar grupo
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={guardarNombre}
          className="dp-text-heading rounded-lg border border-black/10 px-3 py-1.5 text-lg font-semibold outline-none focus:dp-border-brand"
        />
        {guardandoNombre && <span className="dp-muted text-xs">Guardando…</span>}
      </div>

      <div className="flex items-center gap-1.5">
        {(
          [
            { id: "plan", label: "Planificación" },
            { id: "evaluacion", label: "Evaluación grupal" },
            { id: "miembros", label: `Miembros (${miembros.length}/${CUPO_MAXIMO})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id ? "dp-bg-brand text-white" : "dp-bg-faint dp-body"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plan" && (
        <GrupoPlanView
          grupoId={grupo.id}
          semanaActivaId={grupo.semana_activa_id}
          semanasIniciales={semanasIniciales}
          bibliotecaInicial={bibliotecaInicial}
        />
      )}

      {tab === "evaluacion" && <EvaluacionGrupalForm miembros={miembros} />}

      {tab === "miembros" && (
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <p className="dp-muted mb-3 text-xs">
            Hasta {CUPO_MAXIMO} personas por grupo. {guardandoMiembros && "Guardando…"}
          </p>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-black/10">
            {todosLosClientes.map((c) => {
              const elegido = miembros.some((m) => m.id === c.id);
              const deshabilitado = !elegido && miembros.length >= CUPO_MAXIMO;
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-2 border-b border-black/5 px-3 py-2 text-sm last:border-b-0 ${
                    deshabilitado ? "opacity-40" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={elegido}
                    disabled={deshabilitado}
                    onChange={() => toggleMiembro(c)}
                  />
                  <span className="dp-body truncate">{c.nombre}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
