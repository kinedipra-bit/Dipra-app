-- Mini calendario: el cliente confirma desde su portal qué días va a
-- entrenar (fechas sueltas que él mismo toca, no un patrón semanal fijo) —
-- de acá sale el recordatorio push del día.
create table public.client_dias_entrenamiento (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  fecha date not null,
  created_at timestamptz not null default now(),
  unique (client_id, fecha)
);

create index client_dias_entrenamiento_fecha_idx on public.client_dias_entrenamiento (fecha);

alter table public.client_dias_entrenamiento enable row level security;
create policy "client_dias_entrenamiento_all_authenticated" on public.client_dias_entrenamiento for all to authenticated using (true) with check (true);

-- Suscripciones de notificaciones push (Web Push) del portal — un cliente
-- puede tener más de una (ej. instaló la app en el celular y también la
-- abrió en el computador).
create table public.client_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index client_push_subscriptions_client_idx on public.client_push_subscriptions (client_id);

alter table public.client_push_subscriptions enable row level security;
create policy "client_push_subscriptions_all_authenticated" on public.client_push_subscriptions for all to authenticated using (true) with check (true);
