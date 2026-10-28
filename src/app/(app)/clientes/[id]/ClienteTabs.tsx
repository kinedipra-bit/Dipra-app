"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "ficha", label: "Ficha" },
  { segment: "evaluacion", label: "Evaluación" },
  { segment: "plan", label: "Plan" },
  { segment: "tareas", label: "Tareas" },
  { segment: "sesiones", label: "Sesiones" },
  { segment: "evolucion", label: "Evolución" },
  { segment: "finanzas", label: "Finanzas", soloAdmin: true },
];

export function ClienteTabs({
  clienteId,
  esAdmin,
  planSinCompartir = false,
  tareasSinCompartir = false,
}: {
  clienteId: string;
  esAdmin: boolean;
  // Hay cambios editados que todavía no se compartieron con el cliente —
  // antes este aviso solo se veía adentro de Plan/Tareas, así que parado en
  // otra pestaña (ej. Sesiones) no había ninguna señal de que algo quedó
  // pendiente de compartir.
  planSinCompartir?: boolean;
  tareasSinCompartir?: boolean;
}) {
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => !tab.soloAdmin || esAdmin);
  const avisoPorSegmento: Record<string, boolean> = { plan: planSinCompartir, tareas: tareasSinCompartir };

  return (
    <nav className="flex gap-1 border-b border-black/5">
      {tabs.map((tab) => {
        const href = `/clientes/${clienteId}/${tab.segment}`;
        const active = pathname?.startsWith(href);
        const aviso = avisoPorSegmento[tab.segment];
        return (
          <Link
            key={tab.segment}
            href={href}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active ? "dp-border-brand dp-text-brand" : "dp-body border-transparent hover:dp-text-brand"
            }`}
          >
            {tab.label}
            {aviso && (
              <span
                title="Hay cambios sin compartir con el cliente"
                className="dp-bg-amber flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              >
                !
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
