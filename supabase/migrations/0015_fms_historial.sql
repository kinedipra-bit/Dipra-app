-- Historial de evaluaciones FMS: antes `clients.fms` guardaba un único
-- screening "vigente" que se sobreescribía cada vez. Ahora cada evaluación
-- queda guardada con su propia fecha (editable, para poder transferir
-- evaluaciones antiguas con la fecha real en que se tomaron) y se puede
-- cargar una nueva sin perder las anteriores.
create table public.client_fms_historial (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  fecha date not null default current_date,
  fms jsonb not null default '{
    "sentadilla": "", "pasoValla": {"d": "", "i": ""}, "estocada": {"d": "", "i": ""},
    "clearingTobDolor": {"d": false, "i": false}, "clearingTobMob": {"d": false, "i": false},
    "hombro": {"d": "", "i": ""}, "clearingHombro": {"d": false, "i": false},
    "aslr": {"d": "", "i": ""}, "pushUp": "", "clearingExtension": false,
    "rotacion": {"d": "", "i": ""}, "clearingFlexion": false, "toeTouch": "",
    "clearingMuneca": {"der": false, "izq": false}, "seguimientoPropio": {}
  }',
  created_at timestamptz not null default now()
);

create index client_fms_historial_client_idx on public.client_fms_historial (client_id, fecha);

alter table public.client_fms_historial enable row level security;
create policy "client_fms_historial_all_authenticated" on public.client_fms_historial for all to authenticated using (true) with check (true);

-- Backfill: el screening FMS que ya tenía cada cliente en `clients.fms`
-- pasa a ser su primera entrada de historial, fechada en la última
-- actualización del cliente (el profesional puede corregir la fecha
-- después si no corresponde).
insert into public.client_fms_historial (client_id, fecha, fms)
select id, updated_at::date, fms
from public.clients
where fms is not null
  and (
    coalesce(fms->>'sentadilla', '') <> '' or
    coalesce(fms->'pasoValla'->>'d', '') <> '' or
    coalesce(fms->'pasoValla'->>'i', '') <> '' or
    coalesce(fms->'estocada'->>'d', '') <> '' or
    coalesce(fms->'estocada'->>'i', '') <> '' or
    coalesce(fms->'hombro'->>'d', '') <> '' or
    coalesce(fms->'hombro'->>'i', '') <> '' or
    coalesce(fms->'aslr'->>'d', '') <> '' or
    coalesce(fms->'aslr'->>'i', '') <> '' or
    coalesce(fms->>'pushUp', '') <> '' or
    coalesce(fms->'rotacion'->>'d', '') <> '' or
    coalesce(fms->'rotacion'->>'i', '') <> '' or
    coalesce(fms->>'toeTouch', '') <> ''
  );
