import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { InstalarApp } from "@/components/InstalarApp";
import { obtenerClientePortal, sesionValidaPara } from "./acceso";
import { cerrarSesionPin } from "./acciones-acceso";
import { PortalTabs } from "./PortalTabs";

// El manifest global (app/manifest.ts, start_url "/") es para la app del
// profesional — acá se reemplaza por uno propio del portal (start_url al
// portal de ESTE cliente), así "Instalar app" desde el portal no termina
// abriendo el login del profesional.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  return { manifest: `/portal/${token}/manifest.webmanifest` };
}

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cliente = await obtenerClientePortal(token);

  if (!cliente) notFound();

  const autenticado = await sesionValidaPara(cliente.id);

  return (
    <div className="dp-bg-app min-h-screen p-4 sm:p-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="dp-surface flex items-center justify-between gap-4 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="dp-bg-ink flex h-12 w-12 shrink-0 items-center justify-center rounded-xl p-2">
              <Image src="/logo.png" alt="DIPRA" width={40} height={40} className="h-auto w-full" />
            </div>
            <div>
              <p className="dp-text-brand font-[family-name:var(--font-display)] text-lg font-bold tracking-wide">
                DIPRA
              </p>
              <h1 className="dp-muted text-sm">Portal de {cliente.nombre}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <InstalarApp />
            {autenticado && (
              <form action={cerrarSesionPin.bind(null, token)}>
                <button type="submit" className="dp-muted text-xs hover:dp-text-brand">
                  Cerrar sesión
                </button>
              </form>
            )}
          </div>
        </div>

        {autenticado && <PortalTabs token={token} />}

        <div>{children}</div>
      </div>
    </div>
  );
}
