"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// El portal es una PWA que el atleta suele dejar abierta en el celular sin
// cerrarla del todo — al volver a primer plano, nada dispara una navegación
// nueva, así que la página se queda mostrando los datos de la última vez
// que se abrió, aunque el profesional haya compartido cambios mientras
// tanto. Esto fuerza un refresh de los datos del server cada vez que la
// pestaña/app vuelve a verse, para que no haya que cerrarla del todo y
// volver a abrirla para ver lo último.
export function AutoRefreshAlVolver() {
  const router = useRouter();

  useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", refrescar);
    window.addEventListener("pageshow", refrescar);
    return () => {
      document.removeEventListener("visibilitychange", refrescar);
      window.removeEventListener("pageshow", refrescar);
    };
  }, [router]);

  return null;
}
