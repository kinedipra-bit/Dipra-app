"use client";

import { useState, type ReactNode } from "react";

type TabKey = "clinico" | "composicion" | "movilidad" | "rendimiento" | "libres";

const TABS: { key: TabKey; label: string }[] = [
  { key: "clinico", label: "Clínico" },
  { key: "composicion", label: "Composición corporal" },
  { key: "movilidad", label: "Movilidad" },
  { key: "rendimiento", label: "Rendimiento" },
  { key: "libres", label: "Evaluaciones libres" },
];

export function EvaluacionTabs({ secciones }: { secciones: Record<TabKey, ReactNode> }) {
  const [activo, setActivo] = useState<TabKey>("clinico");

  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-black/5">
        {TABS.map((tab) => {
          const active = activo === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActivo(tab.key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                active ? "dp-border-brand dp-text-brand" : "dp-body border-transparent hover:dp-text-brand"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {TABS.map((tab) => (
        <div key={tab.key} className={tab.key === activo ? "flex flex-col gap-6" : "hidden"}>
          {secciones[tab.key]}
        </div>
      ))}
    </div>
  );
}
