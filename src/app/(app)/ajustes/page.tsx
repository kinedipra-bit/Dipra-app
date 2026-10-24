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
    </div>
  );
}
