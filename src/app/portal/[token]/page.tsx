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

  const cliente = await obtenerClientePortal(token);
  if (!cliente) notFound();

  // Sin rutina de fuerza compartida (cliente solo kine, esa pestaña ni
  // siquiera aparece en la navegación) el destino por defecto es Tareas —
  // si no, Mi rutina, como siempre.
  const destino = `/portal/${token}/${cliente.tieneRutinaFuerza ? "plan" : "tareas"}`;

  // Navegación normal (sin link de reseteo): si ya hay sesión, directo al
  // destino; si no, esa misma página muestra el gate de acceso.
  if (!rt) redirect(destino);

  // Llegó por el link de "olvidé mi PIN" — si por algo ya está logueado, no
  // hace falta pasar por el reseteo.
  if (await sesionValidaPara(cliente.id)) redirect(destino);

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
