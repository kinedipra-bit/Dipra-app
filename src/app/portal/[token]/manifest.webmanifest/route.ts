import { NextResponse } from "next/server";

// Manifest propio del portal del cliente — el de la app del profesional
// (app/manifest.ts) tiene start_url "/", que para un cliente sin sesión de
// profesional termina mandando a /login (el login del PROFESIONAL). Acá el
// start_url apunta de vuelta al portal de ESE cliente.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return NextResponse.json(
    {
      // `id` + `scope` propios (distintos de los del manifest del
      // profesional, que son "/") — sin esto, Chrome puede confundir el
      // portal con la app del profesional ya instalada y no ofrecer
      // instalarlo aparte.
      id: `/portal/${token}`,
      name: "DIPRA",
      short_name: "DIPRA",
      description: "Portal del cliente — DIPRA",
      start_url: `/portal/${token}`,
      scope: `/portal/${token}`,
      display: "standalone",
      background_color: "#f3f6f2",
      theme_color: "#1e8449",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
