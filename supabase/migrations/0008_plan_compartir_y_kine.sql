-- "Compartir rutina": separa lo que el profesional está editando (`dias`,
-- borrador) de lo que el cliente realmente ve en su portal
-- (`dias_publicado`) — antes cualquier "Guardar cambios" se reflejaba al
-- toque en el portal; ahora hace falta compartir a propósito. El backfill
-- copia lo que ya estaba en `dias` a `dias_publicado` para no dejar en
-- blanco el portal de clientes que ya lo estaban usando (ej. Carolina).
alter table public.plan_semanas
  add column dias_publicado jsonb,
  add column publicado_at timestamptz,
  add column cambios_sin_compartir boolean not null default false;

update public.plan_semanas set dias_publicado = dias, publicado_at = now();

-- Plan de kinesiología/rehabilitación — independiente del plan de fuerza,
-- SIN el concepto de semanas: un solo set de días en curso por cliente que
-- se va editando directo (ver decisión: "más simple, sin semanas"). Mismo
-- mecanismo de "compartir" que el plan de fuerza.
create table public.plan_kine (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade unique,
  dias jsonb not null default '[]',
  dias_publicado jsonb,
  publicado_at timestamptz,
  cambios_sin_compartir boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plan_kine_set_updated_at
  before update on public.plan_kine
  for each row execute function public.set_updated_at();

alter table public.plan_kine enable row level security;

create policy "plan_kine_all_authenticated"
  on public.plan_kine for all
  to authenticated
  using (true)
  with check (true);
