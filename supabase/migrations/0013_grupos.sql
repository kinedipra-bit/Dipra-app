-- Entrenamientos grupales (hasta 8 personas por hora): un grupo es un
-- roster fijo de clientes con su propia planificación de fuerza (mismo
-- mecanismo de semanas/mesociclo/objetivo que plan_semanas, pero por grupo
-- en vez de por cliente). Las evaluaciones grupales NO tienen tabla propia
-- a propósito: se cargan de una vez para todo el roster desde la pantalla
-- de evaluación grupal, pero cada resultado se guarda en la ficha
-- individual de cada persona (client_pr_historial / client_composicion_corporal
-- / clients.fms) — así el progreso de cada cliente sigue viéndose en su
-- propia Evolución, sin duplicar datos en una estructura paralela.
create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  semana_activa_id uuid,
  created_at timestamptz not null default now()
);

create table public.grupo_miembros (
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  primary key (grupo_id, client_id)
);

create table public.grupo_plan_semanas (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  numero integer not null default 1,
  mesociclo text not null default '',
  objetivo text not null default '',
  dias jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index grupo_plan_semanas_grupo_idx on public.grupo_plan_semanas (grupo_id, numero);

alter table public.grupos
  add constraint grupos_semana_activa_fk foreign key (semana_activa_id)
  references public.grupo_plan_semanas (id) on delete set null;

alter table public.grupos enable row level security;
create policy "grupos_all_authenticated" on public.grupos for all to authenticated using (true) with check (true);

alter table public.grupo_miembros enable row level security;
create policy "grupo_miembros_all_authenticated" on public.grupo_miembros for all to authenticated using (true) with check (true);

alter table public.grupo_plan_semanas enable row level security;
create policy "grupo_plan_semanas_all_authenticated" on public.grupo_plan_semanas for all to authenticated using (true) with check (true);

-- Agenda: una cita de "Entrenamiento grupal" sigue siendo una fila por
-- persona (igual que hoy, nada cambia ahí: cada una mantiene su propio
-- estado/asistencia), pero ahora todas las de la misma clase comparten
-- grupo_id para poder agruparlas al verlas y abrir la planificación del
-- grupo con un clic.
alter table public.citas
  add column grupo_id uuid references public.grupos (id) on delete cascade;

create index citas_grupo_idx on public.citas (grupo_id);
