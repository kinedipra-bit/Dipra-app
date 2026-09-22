"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "plan", label: "Mi rutina" },
  { segment: "sesiones", label: "Mis sesiones" },
  { segment: "evolucion", label: "Mi progreso" },
];

export function PortalTabs({ token }: { token: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-black/5">
      {TABS.map((tab) => {
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
