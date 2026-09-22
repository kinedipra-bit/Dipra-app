"use client";

import { useState } from "react";
import Link from "next/link";
import { createCliente } from "../actions";

export default function NuevoClientePage() {
  const [categoria, setCategoria] = useState("Entrenamiento");

  return (
    <div className="mx-auto max-w-md">
      <Link href="/clientes" className="dp-muted text-sm hover:dp-text-brand">
        ← Clientes
      </Link>

      <h1 className="mt-2 mb-5 font-[family-name:var(--font-display)] text-xl font-semibold dp-text-heading">
        Nuevo cliente
      </h1>

      <form action={createCliente} className="dp-surface flex flex-col gap-4 rounded-2xl p-6 shadow-sm">
        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Nombre completo</span>
          <input
            name="nombre"
            required
            placeholder="Ej. Carolina Silva"
            className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:dp-border-brand"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">¿Viene por rehabilitación o entrenamiento?</span>
          <input type="hidden" name="categoria" value={categoria} />
          <div className="mt-1 flex gap-2">
            {["Rehabilitación", "Entrenamiento"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  categoria === c ? "dp-bg-brand border-transparent text-white" : "dp-body border-black/10"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Objetivo principal</span>
          <textarea
            name="objetivo"
            rows={2}
            placeholder="¿Para qué está entrenando?"
            className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:dp-border-brand"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Teléfono</span>
            <input
              name="telefono"
              className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:dp-border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="dp-body font-medium">Correo</span>
            <input
              name="correo"
              type="email"
              className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:dp-border-brand"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Ocupación</span>
          <input
            name="ocupacion"
            className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:dp-border-brand"
          />
        </label>

        <button type="submit" className="dp-bg-brand mt-2 rounded-xl py-2.5 font-medium text-white transition-colors">
          Crear ficha
        </button>
      </form>
    </div>
  );
}
