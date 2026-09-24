import { notFound, redirect } from "next/navigation";
import { enmascararCorreo } from "@/lib/dipra/portalPin";
import { obtenerClientePortal, sesionValidaPara } from "./acceso";
import { PortalAcceso } from "./PortalAcceso";

export default async function PortalRootPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ rt?: string }>;
}) {
  const { token } = await params;
  const { rt } = await searchParams;

  // Navegación normal (sin link de reseteo): si ya hay sesión, directo a la
  // rutina; si no, la propia /plan muestra el gate de acceso.
  if (!rt) redirect(`/portal/${token}/plan`);

  const cliente = await obtenerClientePortal(token);
  if (!cliente) notFound();

  // Llegó por el link de "olvidé mi PIN" — si por algo ya está logueado, no
  // hace falta pasar por el reseteo.
  if (await sesionValidaPara(cliente.id)) redirect(`/portal/${token}/plan`);

  return (
    <PortalAcceso
      token={token}
      nombre={cliente.nombre}
      correoEnmascarado={cliente.correo ? enmascararCorreo(cliente.correo) : ""}
      pinConfigurado={!!cliente.pinHash}
      rt={rt}
    />
  );
}
