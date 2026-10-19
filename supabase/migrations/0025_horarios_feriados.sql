-- Horario semanal recurrente por cliente — plantilla separada de las citas
-- con fecha concreta (public.citas). "Generar citas" (ver acciones de
-- agenda) la recorre y crea las citas reales de las próximas semanas,
-- saltando feriados.
create table public.horarios_cliente (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  -- 0=lunes .. 4=viernes (la agenda solo opera lunes a viernes).
  dia_semana smallint not null check (dia_semana between 0 and 4),
  hora time not null,
  tipo text not null default '',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index horarios_cliente_client_idx on public.horarios_cliente (client_id);
create index horarios_cliente_dia_hora_idx on public.horarios_cliente (dia_semana, hora);

alter table public.horarios_cliente enable row level security;
create policy "horarios_cliente_all_authenticated" on public.horarios_cliente for all to authenticated using (true) with check (true);

-- Feriados chilenos — "Generar citas" no crea citas en estas fechas (salvo
-- que Estefanía cargue una cita a mano ese día puntual, lo cual sigue
-- siendo libre). Se puede seguir agregando filas a mano si una ley nueva
-- agrega un feriado.
create table public.feriados (
  fecha date primary key,
  nombre text not null default ''
);

alter table public.feriados enable row level security;
create policy "feriados_all_authenticated" on public.feriados for all to authenticated using (true) with check (true);

-- Las citas ya cargadas con el set de 4 categorías anterior (aproximado,
-- sin haber visto la planilla real) pasan a las 6 reales.
update public.citas set tipo = 'Kine' where tipo = 'Kinesiología';
update public.citas set tipo = 'Personalizado' where tipo = 'Rendimiento';
update public.citas set tipo = 'Grupo Fuerza' where tipo = 'Entrenamiento grupal';

insert into public.feriados (fecha, nombre) values
  ('2026-01-01', 'Año Nuevo'),
  ('2026-04-03', 'Viernes Santo'),
  ('2026-04-04', 'Sábado Santo'),
  ('2026-05-01', 'Día del Trabajo'),
  ('2026-05-21', 'Glorias Navales'),
  ('2026-06-21', 'Día Nacional de los Pueblos Indígenas'),
  ('2026-06-29', 'San Pedro y San Pablo'),
  ('2026-07-16', 'Virgen del Carmen'),
  ('2026-08-15', 'Asunción de la Virgen'),
  ('2026-09-18', 'Independencia'),
  ('2026-09-19', 'Glorias del Ejército'),
  ('2026-10-12', 'Encuentro de Dos Mundos'),
  ('2026-10-31', 'Iglesias Evangélicas y Protestantes'),
  ('2026-11-01', 'Todos los Santos'),
  ('2026-12-08', 'Inmaculada Concepción'),
  ('2026-12-25', 'Navidad');
