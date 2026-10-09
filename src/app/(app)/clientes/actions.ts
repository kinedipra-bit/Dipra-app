"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { enviarCorreoLinkPortal } from "@/lib/email";

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
      rut: String(formData.get("rut") ?? "").trim() || null,
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

// Manda por correo el link del portal del cliente — alternativa a
// copiarlo a mano y pasarlo por WhatsApp/lo que sea.
export async function enviarLinkPortal(clienteId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("clients")
    .select("nombre, correo, portal_token")
    .eq("id", clienteId)
    .single<{ nombre: string; correo: string | null; portal_token: string }>();
  if (!cliente) return { ok: false, error: "Cliente no encontrado." };
  if (!cliente.correo?.trim()) {
    return { ok: false, error: "Este cliente todavía no tiene un correo cargado en su ficha." };
  }

  const h = await headers();
  const origen = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const link = `${origen}/portal/${cliente.portal_token}`;

  try {
    await enviarCorreoLinkPortal({ para: cliente.correo, nombre: cliente.nombre, link });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo enviar el correo — intentá de nuevo en un momento.";
    return { ok: false, error: mensaje };
  }
  return { ok: true };
}

export async function updateClienteFicha(clienteId: string, patch: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(patch).eq("id", clienteId);
  if (error) throw new Error(error.message);
  // 'layout' revalida el header (nombre/categoría, visibles en todas las
  // sub-páginas) además de /ficha — no hay página en /clientes/[id] a secas.
  revalidatePath(`/clientes/${clienteId}`, "layout");
}
