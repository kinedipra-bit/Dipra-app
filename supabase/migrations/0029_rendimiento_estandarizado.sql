-- Estandarización de la pestaña de rendimiento — RDL y variante de peso
-- muerto como métricas fijas (antes RDL se cargaba como "metrica_extra" por
-- cliente), más sprint y Cooper en la misma fila de siempre.
alter table public.client_pr_historial
  add column rdl numeric not null default 0,
  add column peso_muerto_variante text check (peso_muerto_variante in ('Barra', 'Hexagonal')),
  add column sprint_segundos numeric not null default 0,
  add column cooper_metros numeric not null default 0;

-- Movilidad articular (lógica FMS: 0-3 por articulación/lado) — historial
-- por fecha, igual patrón que client_fms_historial. Distinto de
-- client_movilidad_esferas (eso es patrón de movimiento libre por esfera
-- corporal, no puntaje articular).
create table public.client_movilidad_articular_historial (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  fecha date not null default current_date,
  hombro_der smallint check (hombro_der between 0 and 3),
  hombro_izq smallint check (hombro_izq between 0 and 3),
  cadera_der smallint check (cadera_der between 0 and 3),
  cadera_izq smallint check (cadera_izq between 0 and 3),
  tobillo_der smallint check (tobillo_der between 0 and 3),
  tobillo_izq smallint check (tobillo_izq between 0 and 3),
  columna_extension smallint check (columna_extension between 0 and 3),
  columna_flexion smallint check (columna_flexion between 0 and 3),
  columna_rotacion_der smallint check (columna_rotacion_der between 0 and 3),
  columna_rotacion_izq smallint check (columna_rotacion_izq between 0 and 3),
  notas text not null default '',
  created_at timestamptz not null default now()
);

create index client_movilidad_articular_historial_client_idx on public.client_movilidad_articular_historial (client_id, fecha);
alter table public.client_movilidad_articular_historial enable row level security;
create policy "movilidad_articular_all_authenticated" on public.client_movilidad_articular_historial for all to authenticated using (true) with check (true);

-- Batería adulto mayor — 5 tests validados (TUG, 30s sit-to-stand, balance
-- unipodal, step-up, velocidad de marcha), un registro por fecha. Los
-- umbrales de riesgo (TUG >=13.5s, balance <5s) se calculan en la UI, no
-- acá, para poder ajustarlos sin migración.
create table public.client_bateria_adulto_mayor (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  fecha date not null default current_date,
  tug_segundos numeric,
  sit_to_stand_reps smallint,
  balance_unipodal_der_segundos numeric,
  balance_unipodal_izq_segundos numeric,
  step_up_reps smallint,
  velocidad_marcha_mseg numeric,
  notas text not null default '',
  created_at timestamptz not null default now()
);

create index client_bateria_adulto_mayor_client_idx on public.client_bateria_adulto_mayor (client_id, fecha);
alter table public.client_bateria_adulto_mayor enable row level security;
create policy "bateria_adulto_mayor_all_authenticated" on public.client_bateria_adulto_mayor for all to authenticated using (true) with check (true);
