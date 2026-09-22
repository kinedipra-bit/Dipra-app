"use client";

import { useState } from "react";

export function CopyPortalLink({ portalToken }: { portalToken: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    const url = `${window.location.origin}/portal/${portalToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      prompt("Copiá el link del portal:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={copiar}
      className="dp-body rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium"
    >
      {copiado ? "¡Copiado!" : "Link del portal"}
    </button>
  );
}
