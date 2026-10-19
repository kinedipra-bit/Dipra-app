import { createClient } from "@/lib/supabase/server";
import { ImportarHorarioView } from "./ImportarHorarioView";

export default async function ImportarHorarioPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clients")
    .select("id, nombre")
    .order("nombre")
    .returns<{ id: string; nombre: string }[]>();

  return <ImportarHorarioView clientes={clientes ?? []} />;
}
