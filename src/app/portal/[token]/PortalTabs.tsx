"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "plan", label: "Mi rutina", requiereRutinaFuerza: true },
  { segment: "tareas", label: "Tareas", requiereRutinaFuerza: false },
  { segment: "sesiones", label: "Mis sesiones", requiereRutinaFuerza: true },
  { segment: "historico", label: "Histórico", requiereRutinaFuerza: false },
  { segment: "evolucion", label: "Mi progreso", requiereRutinaFuerza: false },
];

export function PortalTabs({ token, tieneRutinaFuerza }: { token: string; tieneRutinaFuerza: boolean }) {
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => !tab.requiereRutinaFuerza || tieneRutinaFuerza);

  return (
    <nav className="flex gap-1 border-b border-black/5">
      {tabs.map((tab) => {
        const href = `/portal/${token}/${tab.segment}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={tab.segment}
            href={href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active ? "dp-border-brand dp-text-brand" : "dp-body border-transparent hover:dp-text-brand"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
