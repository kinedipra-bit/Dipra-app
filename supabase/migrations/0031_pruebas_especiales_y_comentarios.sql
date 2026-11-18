-- Comentario por prueba de rendimiento (ej. "Dead hang: le dolió la
-- espalda") — antes client_pr_historial solo guardaba números, sin forma
-- de anotar nada puntual de una métrica concreta de esa visita.
alter table public.client_pr_historial
  add column notas jsonb not null default '{}'::jsonb;

-- Pruebas especiales: reemplaza a la pestaña "Movilidad articular" (que
-- queda guardada en su tabla, sin romperse, por si se necesita después,
-- pero deja de mostrarse) — acá quedan registradas pruebas puntuales con
-- su propio formato, visibles sin tener que abrir el FMS.
create table public.client_pruebas_especiales_historial (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  fecha date not null default current_date,
  -- Dorsiflexión de tobillo (knee-to-wall): cm de referencia + semáforo
  -- elegido a mano por el profesional (no se calcula solo).
  tobillo_der_cm numeric,
  tobillo_der_color text check (tobillo_der_color is null or tobillo_der_color in ('rojo', 'amarillo', 'verde')),
  tobillo_izq_cm numeric,
  tobillo_izq_color text check (tobillo_izq_color is null or tobillo_izq_color in ('rojo', 'amarillo', 'verde')),
  -- Hombro: positivo/negativo por lado, igual criterio que los clearing
  -- tests del FMS.
  hombro_arco_doloroso_der boolean not null default false,
  hombro_arco_doloroso_izq boolean not null default false,
  neer_der boolean not null default false,
  neer_izq boolean not null default false,
  jobe_der boolean not null default false,
  jobe_izq boolean not null default false,
  hawkins_der boolean not null default false,
  hawkins_izq boolean not null default false,
  -- ASLR de pie / en punta de pies: no es un test estándar con una sola
  -- medida, así que queda como positivo/negativo + comentario libre.
  aslr_pie_der boolean not null default false,
  aslr_pie_izq boolean not null default false,
  aslr_pie_comentario text not null default '',
  -- Rotación torácica respecto de lumbar (lumbar locked rotation test):
  -- medición estándar en grados, más un positivo/negativo de dolor aparte
  -- (para descartar componente lumbar, distinto del grado de movilidad).
  rotacion_toracica_der_grados numeric,
  rotacion_toracica_izq_grados numeric,
  rotacion_toracica_dolor_der boolean not null default false,
  rotacion_toracica_dolor_izq boolean not null default false,
  rotacion_toracica_comentario text not null default '',
  notas text not null default '',
  created_at timestamptz not null default now()
);

create index client_pruebas_especiales_historial_client_idx
  on public.client_pruebas_especiales_historial (client_id, fecha);

alter table public.client_pruebas_especiales_historial enable row level security;
create policy "client_pruebas_especiales_historial_all_authenticated"
  on public.client_pruebas_especiales_historial for all to authenticated using (true) with check (true);

-- Movilidad por esferas: checkboxes de qué cadena domina cada esfera
-- (cráneo/tórax/pelvis/tobillo — ver ESFERA_TAGS en constants.ts) además
-- del comentario libre que ya existía, y un dibujo opcional (mini pizarra
-- de diagnóstico de cadenas).
alter table public.client_movilidad_esferas
  add column tags jsonb not null default '{}'::jsonb,
  add column dibujo_path text;

-- Bucket de Storage para los dibujos de cadenas — mismo criterio de
-- acceso que "indicaciones" (público: no son datos de identificación).
insert into storage.buckets (id, name, public)
values ('diagramas', 'diagramas', true)
on conflict (id) do nothing;

create policy "diagramas_lectura_publica"
  on storage.objects for select
  to public
  using (bucket_id = 'diagramas');

create policy "diagramas_escritura_autenticados"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'diagramas')
  with check (bucket_id = 'diagramas');
