"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { crearGrupo } from "../actions";

const CUPO_MAXIMO = 8;

export function NuevoGrupoForm({ clientes }: { clientes: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [miembros, setMiembros] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const toggleMiembro = (id: string) => {
    setMiembros((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : prev.length < CUPO_MAXIMO ? [...prev, id] : prev
    );
  };

  const crear = () => {
    if (!nombre.trim()) return;
    startTransition(async () => {
      const grupo = await crearGrupo(nombre.trim(), miembros);
      router.push(`/grupos/${grupo.id}`);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/grupos" className="dp-muted text-sm hover:dp-text-brand">
        ← Grupos
      </Link>

      <div className="dp-surface mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl p-6 shadow-sm">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold dp-text-heading">
          Nuevo grupo
        </h1>

        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Nombre del grupo</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Grupo 7pm"
            autoFocus
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
          />
        </label>

        <div>
          <p className="dp-body mb-1.5 flex items-center justify-between text-sm font-medium">
            <span>Miembros</span>
            <span className="dp-muted text-xs font-normal">
              {miembros.length} / {CUPO_MAXIMO}
            </span>
          </p>
          {clientes.length === 0 ? (
            <p className="dp-muted text-xs">Todavía no hay clientes cargados.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-black/10">
              {clientes.map((c) => {
                const elegido = miembros.includes(c.id);
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
                      onChange={() => toggleMiembro(c.id)}
                    />
                    <span className="dp-body truncate">{c.nombre}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={crear}
          disabled={!nombre.trim() || pending}
          className="dp-bg-brand mt-2 rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Creando…" : "Crear grupo"}
        </button>
      </div>
    </div>
  );
}
