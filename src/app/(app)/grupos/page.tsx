import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Grupo } from "@/lib/dipra/types";

export default async function GruposPage() {
  const supabase = await createClient();

  const { data: grupos } = await supabase
    .from("grupos")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Grupo[]>();

  const { data: miembros } = await supabase.from("grupo_miembros").select("grupo_id, client_id");

  const conteoPorGrupo = new Map<string, number>();
  (miembros ?? []).forEach((m) => {
    conteoPorGrupo.set(m.grupo_id, (conteoPorGrupo.get(m.grupo_id) ?? 0) + 1);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold dp-text-heading">
          Entrenamientos grupales
        </h1>
        <Link
          href="/grupos/nuevo"
          className="dp-bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white"
        >
          + Nuevo grupo
        </Link>
      </div>

      {(grupos ?? []).length === 0 ? (
        <p className="dp-muted dp-surface rounded-2xl p-8 text-center text-sm shadow-sm">
          Todavía no hay grupos creados. Un grupo es un cupo fijo de hasta 8 personas (ej. &quot;Grupo 7pm&quot;) con
          su propia planificación y evaluaciones.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {(grupos ?? []).map((g) => (
            <Link
              key={g.id}
              href={`/grupos/${g.id}`}
              className="dp-surface flex items-center justify-between rounded-2xl p-4 shadow-sm hover:dp-bg-faint"
            >
              <span className="dp-text-heading text-sm font-medium">{g.nombre}</span>
              <span className="dp-muted text-xs">{conteoPorGrupo.get(g.id) ?? 0} / 8 personas</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
