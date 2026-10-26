import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerRolActual } from "@/lib/dipra/auth";
import type { Cliente } from "@/lib/dipra/types";
import { ImportarSeguimientoView } from "./ImportarSeguimientoView";

export type ClienteExistente = Pick<
  Cliente,
  "id" | "nombre" | "rut" | "correo" | "fecha_nacimiento" | "categoria" | "antecedentes" | "campos_extra" | "diagnostico_kinesico" | "motivo_consulta"
>;

export default async function ImportarSeguimientoPage() {
  if ((await obtenerRolActual()) !== "admin") redirect("/");

  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clients")
    .select("id, nombre, rut, correo, fecha_nacimiento, categoria, antecedentes, campos_extra, diagnostico_kinesico, motivo_consulta")
    .order("nombre")
    .returns<ClienteExistente[]>();

  return <ImportarSeguimientoView clientesExistentes={clientes ?? []} />;
}
