import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/dipra/types";
import { FichaForm } from "./FichaForm";

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cliente } = await supabase.from("clients").select("*").eq("id", id).single<Cliente>();

  if (!cliente) notFound();

  return <FichaForm cliente={cliente} />;
}
