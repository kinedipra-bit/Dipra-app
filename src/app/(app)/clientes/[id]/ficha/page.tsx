import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/dipra/types";
import { FichaForm } from "./FichaForm";

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: cliente }, { data: userData }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single<Cliente>(),
    supabase.auth.getUser(),
  ]);

  if (!cliente) notFound();

  let linkBoletasSii: string | null = null;
  if (userData.user) {
    const { data: professional } = await supabase
      .from("professionals")
      .select("link_boletas_sii")
      .eq("id", userData.user.id)
      .single<{ link_boletas_sii: string | null }>();
    linkBoletasSii = professional?.link_boletas_sii ?? null;
  }

  return <FichaForm cliente={cliente} linkBoletasSii={linkBoletasSii} />;
}
