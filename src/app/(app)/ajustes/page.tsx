import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerRolActual } from "@/lib/dipra/auth";
import { AjustesForm } from "./AjustesForm";
import { InvitarColaboradorForm } from "./InvitarColaboradorForm";
import { ColaboradoresForm } from "./ColaboradoresForm";
import { listarColaboradores } from "./actions";

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if ((await obtenerRolActual()) !== "admin") redirect("/");

  const { data: professional } = await supabase
    .from("professionals")
    .select("link_boletas_sii")
    .eq("id", user.id)
    .single<{ link_boletas_sii: string | null }>();

  const colaboradores = await listarColaboradores();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold dp-text-heading">Ajustes</h1>
      <InvitarColaboradorForm />
      <ColaboradoresForm colaboradores={colaboradores} />
      <AjustesForm initialLinkBoletasSii={professional?.link_boletas_sii ?? null} />
      <section className="dp-surface rounded-2xl p-5 shadow-sm">
        <h2 className="mb-1 font-medium dp-text-heading">Importar seguimiento desde Excel</h2>
        <p className="dp-muted mb-3 text-xs">
          Carga única de los datos de salud/rendimiento del Excel de seguimiento — muestra una vista previa
          antes de guardar nada.
        </p>
        <Link href="/ajustes/importar-seguimiento" className="dp-text-brand text-sm font-medium hover:underline">
          Ir a la importación →
        </Link>
      </section>
    </div>
  );
}
