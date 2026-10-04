import { createClient } from "@/lib/supabase/server";
import type { Grupo } from "@/lib/dipra/types";
import { NuevaCitaForm } from "./NuevaCitaForm";

export default async function NuevaCitaPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string; clienteNombre?: string; fecha?: string; hora?: string }>;
}) {
  const { clienteId, clienteNombre, fecha, hora } = await searchParams;

  const supabase = await createClient();
  const [{ data: clientes }, { data: grupos }] = await Promise.all([
    supabase.from("clients").select("id, nombre").order("nombre").returns<{ id: string; nombre: string }[]>(),
    supabase.from("grupos").select("*").order("nombre").returns<Grupo[]>(),
  ]);

  return (
    <NuevaCitaForm
      clientes={clientes ?? []}
      grupos={grupos ?? []}
      clienteIdInicial={clienteId ?? ""}
      clienteNombreInicial={clienteNombre ?? ""}
      fechaInicial={fecha ?? new Date().toISOString().slice(0, 10)}
      horaInicial={hora ?? "09:00"}
    />
  );
}
