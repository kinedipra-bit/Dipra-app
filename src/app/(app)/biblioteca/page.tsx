import { createClient } from "@/lib/supabase/server";
import type { EjercicioBiblioteca } from "@/lib/dipra/types";
import { BibliotecaView } from "./BibliotecaView";

export default async function BibliotecaPage() {
  const supabase = await createClient();
  const { data: biblioteca } = await supabase
    .from("biblioteca_ejercicios")
    .select("id, nombre, link")
    .order("nombre")
    .returns<EjercicioBiblioteca[]>();

  return <BibliotecaView bibliotecaInicial={biblioteca ?? []} />;
}
