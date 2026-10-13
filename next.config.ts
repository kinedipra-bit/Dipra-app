import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Para poder subir el PDF de "Indicaciones" (ver tareas/actions.ts) —
    // el límite por defecto de Server Actions es 1MB, muy poco para un PDF
    // con texto/imágenes. 4MB porque Vercel mismo no deja pasar de ahí en
    // funciones serverless, así que pedir más acá no serviría de nada.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
