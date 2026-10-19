import { createClient } from "@/lib/supabase/server";
import { listarHorarios } from "./actions";
import { HorariosView } from "./HorariosView";

export default async function HorariosPage() {
  const supabase = await createClient();

  const [horarios, { data: clientes }] = await Promise.all([
    listarHorarios(),
    supabase.from("clients").select("id, nombre").order("nombre").returns<{ id: string; nombre: string }[]>(),
  ]);

  return <HorariosView horariosIniciales={horarios} clientes={clientes ?? []} />;
}
