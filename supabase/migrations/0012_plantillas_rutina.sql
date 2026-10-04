-- Biblioteca de rutinas: plantillas reutilizables de planificación de
-- fuerza (bloques/ejercicios de una semana), para no partir de cero cada
-- vez. `cliente_id` nulo = plantilla general (disponible para cualquier
-- cliente); con `cliente_id` = plantilla propia de ese cliente, para
-- seguir su línea de trabajo en mesociclos futuros.
create table public.plantillas_rutina (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clients (id) on delete cascade,
  titulo text not null,
  mesociclo text not null default '',
  objetivo text not null default '',
  dias jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index plantillas_rutina_cliente_idx on public.plantillas_rutina (cliente_id);

alter table public.plantillas_rutina enable row level security;

create policy "plantillas_rutina_all_authenticated"
  on public.plantillas_rutina for all
  to authenticated
  using (true)
  with check (true);
