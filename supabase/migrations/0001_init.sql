-- DIPRA — esquema inicial
--
-- Decisiones de diseño (para quien retome esto):
--
-- 1. Modelo de acceso: sigue siendo "una clínica, varios profesionales" (no
--    multi-tenant todavía). Cualquier profesional autenticado puede ver y
--    editar todos los clientes -- igual que el prototipo, pero ahora con
--    login real por persona (Supabase Auth) en vez de una contraseña
--    compartida. Si en el futuro DIPRA suma otra sede/equipo, acá es donde
--    habría que introducir un `org_id`.
--
-- 2. JSONB vs. tablas hijas: se usa JSONB para objetos que la UI siempre
--    lee/escribe como un todo y no necesitan filtrarse por SQL (fms,
--    pilares, antecedentes, dolor_alicia, campos_extra, y los días/bloques/
--    ejercicios de cada semana de plan). Se usan tablas hijas reales para
--    listas que crecen registro a registro y se benefician de updates
--    atómicos por fila (composición corporal, historial de marcas,
--    movilidad por esferas, evaluaciones específicas, sesiones, citas).
--    Esto es lo que resuelve el problema de "última escritura gana" que
--    tenía el prototipo (persist/persistMerge sobre un único blob JSON).
--
-- 3. IDs: se reemplazan los ids `uid()` (no-UUID) del prototipo por
--    `gen_random_uuid()` real en todas las tablas nuevas.
--
-- 4. Portal del atleta: en vez de "elegir tu nombre de una lista" (cualquiera
--    podía ver los datos de cualquier cliente), cada cliente tiene un
--    `portal_token` propio (UUID) que actúa como link de acceso de solo
--    lectura/comentario. El acceso del portal se sirve desde rutas de
--    servidor de Next.js usando la service role key (nunca se expone la
--    tabla `clients` completa al rol `anon`), validando el token ahí.
--    Esto es más simple que replicar Supabase Auth para cada atleta y ya
--    cierra el hueco de seguridad más obvio que señalaría una revisión.
--
-- 5. clearingTobMob (FMS) se persiste igual que en el prototipo aunque hoy
--    no tenga UI, para no perder compatibilidad si se decide mostrarlo más
--    adelante.

create extension if not exists "pgcrypto";

-- ============================================================
-- Profesionales (1 fila por persona con login real)
-- ============================================================
create table public.professionals (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.professionals enable row level security;

create policy "professionals_select_own_or_any_authenticated"
  on public.professionals for select
  to authenticated
  using (true);

create policy "professionals_insert_self"
  on public.professionals for insert
  to authenticated
  with check (id = auth.uid());

create policy "professionals_update_self"
  on public.professionals for update
  to authenticated
  using (id = auth.uid());

-- ============================================================
-- Clientes / atletas
-- ============================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  iniciales text not null default '',
  telefono text not null default '',
  correo text not null default '',
  categoria text not null default '',
  ocupacion text not null default '',
  objetivo text not null default '',
  inicio date not null default current_date,

  -- objetos "de un solo bloque" (ver nota 2 arriba)
  pilares jsonb not null default '{"movimiento":"","sueno":"","nutricion":"","mindset":"","regeneracion":""}',
  antecedentes jsonb not null default '{"morbidos":"","qx":"","partos":"","hormonal":"","cronicas":"","respiratorios":"","sistemicos":"","neurologicos":"","cardiacos":"","cancer":"","deporte":"","lesiones":""}',
  campos_extra jsonb not null default '[]',
  dolor_alicia jsonb not null default '{}',
  fms jsonb not null default '{
    "sentadilla": "", "pasoValla": {"d": "", "i": ""}, "estocada": {"d": "", "i": ""},
    "clearingTobDolor": {"d": false, "i": false}, "clearingTobMob": {"d": false, "i": false},
    "hombro": {"d": "", "i": ""}, "clearingHombro": {"d": false, "i": false},
    "aslr": {"d": "", "i": ""}, "pushUp": "", "clearingExtension": false,
    "rotacion": {"d": "", "i": ""}, "clearingFlexion": false, "toeTouch": "",
    "clearingMuneca": {"der": false, "izq": false}, "seguimientoPropio": {}
  }',

  portal_token uuid not null default gen_random_uuid() unique,

  created_by uuid references public.professionals (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_nombre_idx on public.clients (nombre);

alter table public.clients enable row level security;

create policy "clients_all_authenticated"
  on public.clients for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Composición corporal (histórico, una fila por medición)
-- ============================================================
create table public.client_composicion_corporal (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  fecha date not null default current_date,
  talla numeric,
  peso numeric,
  grasa_pct numeric,
  masa_muscular numeric,
  agua_pct numeric,
  masa_osea numeric,
  created_at timestamptz not null default now()
);

create index client_composicion_corporal_client_idx on public.client_composicion_corporal (client_id, fecha);

alter table public.client_composicion_corporal enable row level security;

create policy "composicion_all_authenticated"
  on public.client_composicion_corporal for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Historial de marcas / rendimiento (prHistorial)
-- ============================================================
create table public.client_pr_historial (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  fecha date not null default current_date,
  mesociclo text not null default '',
  objetivo text not null default '',

  sentadilla numeric not null default 0,
  peso_muerto numeric not null default 0,
  press_banca numeric not null default 0,
  press_militar numeric not null default 0,

  broad_jump numeric not null default 0,
  abalakov_jump numeric not null default 0,
  cmj numeric not null default 0,
  squat_jump numeric not null default 0,

  agarre_der numeric not null default 0,
  agarre_izq numeric not null default 0,
  dead_hang numeric not null default 0,
  pull_ups numeric not null default 0,
  push_up numeric not null default 0,
  plancha_frontal numeric not null default 0,
  plancha_lateral_der numeric not null default 0,
  plancha_lateral_izq numeric not null default 0,
  pararse_del_suelo numeric not null default 0,

  created_at timestamptz not null default now()
);

create index client_pr_historial_client_idx on public.client_pr_historial (client_id, fecha);

alter table public.client_pr_historial enable row level security;

create policy "pr_historial_all_authenticated"
  on public.client_pr_historial for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Movilidad por esferas
-- ============================================================
create table public.client_movilidad_esferas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  patron text not null default '',
  craneo text not null default '',
  torax text not null default '',
  pelvis text not null default '',
  tobillo text not null default '',
  created_at timestamptz not null default now()
);

create index client_movilidad_esferas_client_idx on public.client_movilidad_esferas (client_id);

alter table public.client_movilidad_esferas enable row level security;

create policy "movilidad_all_authenticated"
  on public.client_movilidad_esferas for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Evaluaciones específicas agregables (Up and go, unipodal, etc.)
-- ============================================================
create table public.client_evaluaciones_custom (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  nombre text not null default '',
  resultado text not null default '',
  created_at timestamptz not null default now()
);

create index client_evaluaciones_custom_client_idx on public.client_evaluaciones_custom (client_id);

alter table public.client_evaluaciones_custom enable row level security;

create policy "evaluaciones_custom_all_authenticated"
  on public.client_evaluaciones_custom for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Planificación: una fila por semana/mesociclo.
-- `dias` guarda el árbol completo [{label, foco, bloques:[{title, exercises:[...]}]}]
-- tal cual lo edita PlanTab, para no fragmentar en 4 tablas algo que
-- siempre se lee/escribe entero.
-- ============================================================
create table public.plan_semanas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  numero integer not null default 1,
  mesociclo text not null default '',
  objetivo text not null default '',
  dias jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plan_semanas_client_idx on public.plan_semanas (client_id, numero);

alter table public.plan_semanas enable row level security;

create policy "plan_semanas_all_authenticated"
  on public.plan_semanas for all
  to authenticated
  using (true)
  with check (true);

-- semana activa por cliente (reemplaza plan.semanaActivaId)
alter table public.clients
  add column semana_activa_id uuid references public.plan_semanas (id) on delete set null;

-- ============================================================
-- Sesiones
-- ============================================================
create table public.sesiones (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null default '',
  dia_plan_label text not null default '',
  es_primera_sesion boolean not null default false,
  comentarios_pre text not null default '',
  pilares jsonb not null default '{"sueno":"","nutricion":"","hidratacion":"","movimiento":"","estres":""}',
  comentarios text not null default '',
  ejercicios jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index sesiones_client_idx on public.sesiones (client_id, fecha);

alter table public.sesiones enable row level security;

create policy "sesiones_all_authenticated"
  on public.sesiones for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Agenda / citas
-- ============================================================
create table public.citas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  cliente_nombre text not null default '',
  fecha date not null,
  hora time not null,
  tipo text not null default '',
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmada', 'alerta', 'cancelada')),
  created_at timestamptz not null default now()
);

create index citas_fecha_idx on public.citas (fecha);

alter table public.citas enable row level security;

create policy "citas_all_authenticated"
  on public.citas for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Biblioteca de ejercicios
-- ============================================================
create table public.biblioteca_ejercicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  link text not null default '',
  created_at timestamptz not null default now()
);

create index biblioteca_ejercicios_nombre_idx on public.biblioteca_ejercicios (nombre);

alter table public.biblioteca_ejercicios enable row level security;

create policy "biblioteca_all_authenticated"
  on public.biblioteca_ejercicios for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- updated_at automático
-- ============================================================
create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger plan_semanas_set_updated_at
  before update on public.plan_semanas
  for each row execute function public.set_updated_at();
