-- Marca de "hecho" para las tareas de kinesiología — separada de las
-- sesiones de fuerza (sesiones), porque las tareas de kine no tienen un
-- "día del plan" con fecha como la rutina de fuerza: son ejercicios para
-- hacer por su cuenta, y hasta ahora no quedaba registro de si el cliente
-- las hizo o no. dia_id referencia el id de un DiaPlan dentro de
-- plan_kine.dias (jsonb, no FK real) — un check-in de un día que después
-- se borró queda como historial sin romper nada.
create table public.client_tareas_checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  dia_id uuid not null,
  dia_label text not null default '',
  fecha date not null default current_date,
  created_at timestamptz not null default now(),
  unique (client_id, dia_id, fecha)
);

create index client_tareas_checkins_client_idx on public.client_tareas_checkins (client_id, fecha);

alter table public.client_tareas_checkins enable row level security;
create policy "client_tareas_checkins_all_authenticated" on public.client_tareas_checkins for all to authenticated using (true) with check (true);
