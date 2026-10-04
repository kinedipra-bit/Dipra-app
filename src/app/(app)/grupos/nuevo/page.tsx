import { createClient } from "@/lib/supabase/server";
import { NuevoGrupoForm } from "./NuevoGrupoForm";

export default async function NuevoGrupoPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clients")
    .select("id, nombre")
    .order("nombre")
    .returns<{ id: string; nombre: string }[]>();

  return <NuevoGrupoForm clientes={clientes ?? []} />;
}
