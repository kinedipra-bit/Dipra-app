-- Check-in diario de dolor/energía — separado de client_tareas_checkins
-- (que solo marca "hice la tarea sí/no" por día del plan). Esto es un pulso
-- rápido de cómo está el cliente HOY en general, independiente de qué
-- tarea haya marcado: un dato por cliente por día, para poder ajustar la
-- carga a tiempo y mostrar la tendencia en el tiempo.
create table public.client_checkins_diarios (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  fecha date not null default current_date,
  -- 0 = nada, 5 = mucho dolor/molestia.
  dolor smallint not null check (dolor between 0 and 5),
  -- 0 = agotado, 5 = con toda la energía.
  energia smallint not null check (energia between 0 and 5),
  nota text not null default '',
  created_at timestamptz not null default now(),
  unique (client_id, fecha)
);

create index client_checkins_diarios_client_idx on public.client_checkins_diarios (client_id, fecha);

alter table public.client_checkins_diarios enable row level security;
create policy "client_checkins_diarios_all_authenticated" on public.client_checkins_diarios for all to authenticated using (true) with check (true);
