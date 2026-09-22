import { createClient } from "@/lib/supabase/server";
import { NuevaCitaForm } from "./NuevaCitaForm";

export default async function NuevaCitaPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string; clienteNombre?: string; fecha?: string }>;
}) {
  const { clienteId, clienteNombre, fecha } = await searchParams;

  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clients")
    .select("id, nombre")
    .order("nombre")
    .returns<{ id: string; nombre: string }[]>();

  return (
    <NuevaCitaForm
      clientes={clientes ?? []}
      clienteIdInicial={clienteId ?? ""}
      clienteNombreInicial={clienteNombre ?? ""}
      fechaInicial={fecha ?? new Date().toISOString().slice(0, 10)}
    />
  );
}
