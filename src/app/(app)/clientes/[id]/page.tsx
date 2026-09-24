import { redirect } from "next/navigation";

// Red de seguridad: /clientes/[id] no tiene contenido propio (todo vive en
// las sub-rutas /ficha, /evaluacion, /plan, etc.), así que cualquier link
// que apunte acá a secas redirige a /ficha en vez de tirar 404.
export default async function ClienteRootPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/clientes/${id}/ficha`);
}
