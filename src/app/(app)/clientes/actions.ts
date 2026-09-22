"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCliente(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("El nombre es obligatorio");

  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      nombre,
      iniciales,
      telefono: String(formData.get("telefono") ?? ""),
      correo: String(formData.get("correo") ?? ""),
      categoria: String(formData.get("categoria") ?? ""),
      ocupacion: String(formData.get("ocupacion") ?? ""),
      objetivo: String(formData.get("objetivo") ?? ""),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}/ficha`);
}

export async function deleteCliente(clienteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", clienteId);
  if (error) throw new Error(error.message);
  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function updateClienteFicha(clienteId: string, patch: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(patch).eq("id", clienteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}`);
}
