-- Finanzas: catálogo de servicios con precio, qué servicio/plan tiene
-- asignado cada cliente, pagos recibidos (ingresos) y gastos de la
-- clínica — módulo administrativo, no clínico.
create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null default 'sesion' check (tipo in ('sesion', 'plan')),
  precio numeric not null default 0,
  -- Solo aplica a tipo='plan' (ej. "mensual") — una sesión suelta no se
  -- repite sola, un plan sí define cada cuánto se vuelve a cobrar.
  periodicidad text not null default '',
  descripcion text not null default '',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Qué servicio/plan tiene (o tuvo) asignado cada cliente — un cliente
-- puede tener varios a la vez (ej. sesiones sueltas de kinesiología +
-- un plan mensual de entrenamiento) o un historial de planes pasados.
create table public.cliente_servicios (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  servicio_id uuid not null references public.servicios (id) on delete restrict,
  -- Snapshot del precio al asignarlo — si el catálogo cambia después, o
  -- se negoció un precio distinto con ese cliente puntual, esto no se
  -- mueve solo.
  precio_acordado numeric not null default 0,
  fecha_inicio date not null default current_date,
  fecha_fin date,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index cliente_servicios_client_idx on public.cliente_servicios (client_id);

-- Pagos recibidos — puede asociarse a un cliente_servicios puntual (para
-- saber qué plan cubre y de qué período) o quedar suelto (pago de una
-- sesión individual sin plan detrás).
create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  cliente_servicio_id uuid references public.cliente_servicios (id) on delete set null,
  monto numeric not null default 0,
  fecha date not null default current_date,
  metodo text not null default '',
  -- Para planes periódicos: qué período cubre este pago, ej. "2026-10" —
  -- así se puede saber si el mes en curso ya está pagado o no.
  periodo text not null default '',
  comentario text not null default '',
  created_at timestamptz not null default now()
);

create index pagos_client_idx on public.pagos (client_id, fecha);

create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  categoria text not null default '',
  monto numeric not null default 0,
  descripcion text not null default '',
  created_at timestamptz not null default now()
);

create index gastos_fecha_idx on public.gastos (fecha);

alter table public.servicios enable row level security;
create policy "servicios_all_authenticated" on public.servicios for all to authenticated using (true) with check (true);

alter table public.cliente_servicios enable row level security;
create policy "cliente_servicios_all_authenticated" on public.cliente_servicios for all to authenticated using (true) with check (true);

alter table public.pagos enable row level security;
create policy "pagos_all_authenticated" on public.pagos for all to authenticated using (true) with check (true);

alter table public.gastos enable row level security;
create policy "gastos_all_authenticated" on public.gastos for all to authenticated using (true) with check (true);
