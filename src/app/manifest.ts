import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DIPRA",
    short_name: "DIPRA",
    description: "Gestión clínica y de rendimiento — DIPRA",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f6f2",
    theme_color: "#1e8449",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
