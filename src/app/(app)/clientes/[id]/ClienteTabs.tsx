"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "ficha", label: "Ficha" },
  { segment: "evaluacion", label: "Evaluación" },
  { segment: "plan", label: "Plan" },
  { segment: "sesiones", label: "Sesiones" },
  { segment: "evolucion", label: "Evolución" },
];

export function ClienteTabs({ clienteId }: { clienteId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-black/5">
      {TABS.map((tab) => {
        const href = `/clientes/${clienteId}/${tab.segment}`;
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
