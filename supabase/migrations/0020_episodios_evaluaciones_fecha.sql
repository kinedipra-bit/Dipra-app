-- Motivo de consulta + ALICIA pasan de ser un valor único (se pisaba si el
-- paciente volvía por una consulta distinta) a un historial por fecha, igual
-- patrón que client_fms_historial. Van en la misma fila porque en la
-- práctica un motivo de consulta nuevo trae su propia ALICIA — son "el mismo
-- episodio". Las columnas viejas en clients quedan sin usar (nada más las
-- lee), no se borran para no perder datos.
create table public.client_episodios_historial (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  fecha date not null default current_date,
  motivo_consulta text not null default '',
  dolor_alicia jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index client_episodios_historial_client_idx on public.client_episodios_historial (client_id);

alter table public.client_episodios_historial enable row level security;

create policy "episodios_historial_all_authenticated"
  on public.client_episodios_historial for all
  to authenticated
  using (true)
  with check (true);

-- El motivo/dolor actual de cada cliente pasa a ser su primer episodio.
insert into public.client_episodios_historial (client_id, fecha, motivo_consulta, dolor_alicia)
select id, coalesce(updated_at::date, created_at::date, current_date), motivo_consulta, dolor_alicia
from public.clients
where motivo_consulta <> '' or dolor_alicia <> '{}'::jsonb;

-- "Evaluaciones específicas" (tests ortopédicos y otros) suma fecha visible
-- y editable — hoy tenía created_at pero no se mostraba en pantalla.
alter table public.client_evaluaciones_custom
  add column fecha date not null default current_date;

update public.client_evaluaciones_custom
  set fecha = created_at::date;
