-- Métricas de rendimiento personalizadas (ej. "RDL") — además de las fijas
-- (sentadilla, peso muerto, saltos, etc.), el profesional puede agregar
-- nuevos ejercicios a seguir, por cliente o para todos. Los valores quedan
-- en `client_pr_historial.extra` (jsonb, clave = id de la fila de abajo),
-- al lado de las columnas fijas de siempre — mismo registro de mesociclo,
-- sin tabla aparte.
alter table public.client_pr_historial add column extra jsonb not null default '{}';

create table public.metricas_rendimiento_extra (
  id uuid primary key default gen_random_uuid(),
  -- null = disponible para todos los clientes (igual que plantillas_rutina).
  cliente_id uuid references public.clients (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

create index metricas_rendimiento_extra_cliente_idx on public.metricas_rendimiento_extra (cliente_id);

alter table public.metricas_rendimiento_extra enable row level security;
create policy "metricas_rendimiento_extra_all_authenticated" on public.metricas_rendimiento_extra for all to authenticated using (true) with check (true);
