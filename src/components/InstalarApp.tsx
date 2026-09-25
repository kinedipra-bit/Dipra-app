"use client";

import { useEffect, useState } from "react";

// Evento no tipado en lib.dom.d.ts todavía.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function yaInstalada() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/**
 * Botón "Instalar app" visible en toda la app (barra lateral del
 * profesional y header del portal) — antes había que saber buscar el
 * ícono/menú propio del navegador, que no todos encuentran. En
 * Chrome/Android usa el prompt nativo; en iPhone (que no lo soporta) muestra
 * el paso a paso de "Compartir → Agregar a inicio".
 */
export function InstalarApp({ className }: { className?: string }) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalada, setInstalada] = useState(false);
  const [mostrarPasosIOS, setMostrarPasosIOS] = useState(false);

  // Tiene que ser un efecto (no un lazy initializer de useState): si la app
  // ya está instalada depende de window.matchMedia/navigator, que no existen
  // en el render de servidor — leerlo ahí desincronizaría el HTML del
  // servidor del primer render del cliente.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si falla el registro, el botón de instalar simplemente no va a
        // aparecer en Chrome/Android — no es un error que afecte al resto
        // de la app.
      });
    }

    setInstalada(yaInstalada());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const onInstalled = () => {
      setInstalada(true);
      setPrompt(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (instalada) return null;

  const click = async () => {
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") setInstalada(true);
      setPrompt(null);
      return;
    }
    // iOS, o desktop/Android sin el evento disparado todavía: se explica
    // dónde está el ícono nativo del navegador en vez de no hacer nada.
    setMostrarPasosIOS((v) => !v);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={click}
        className="dp-text-brand text-xs font-medium hover:underline"
      >
        ⬇ Instalar app
      </button>
      {mostrarPasosIOS && (
        <p className="dp-muted mt-1 text-[11px]">
          {esIOS()
            ? "Tocá el botón de compartir (□↑) de Safari y elegí \"Agregar a pantalla de inicio\"."
            : "Buscá el ícono de instalar en la barra de direcciones, o abrí el menú ⋮ → \"Guardar y compartir\" → \"Instalar página como app…\"."}
        </p>
      )}
    </div>
  );
}
