-- PIN de acceso al portal del cliente (registro en la primera visita,
-- login con PIN en las siguientes, reseteo por correo si lo olvida).
--
-- Se guarda en tablas SEPARADAS de `clients` a propósito: el resto de la
-- app hace `select("*")` sobre `clients` en varias páginas del profesional
-- y pasa ese objeto entero a componentes cliente (ej. FichaForm) — si el
-- hash del PIN viviera como columna de `clients`, terminaría viajando al
-- navegador del profesional sin necesidad. Separarlo evita esa clase de
-- fuga aunque `clients` gane más columnas en el futuro.
--
-- Ninguna de estas tablas tiene policies para "authenticated"/"anon": con
-- RLS activado y sin policy, el acceso queda denegado por defecto para
-- esos roles. Solo el service role (createAdminClient(), que ya es como el
-- portal lee/escribe todo lo demás) puede tocarlas.

create table public.client_portal_auth (
  client_id uuid primary key references public.clients (id) on delete cascade,
  pin_hash text,
  pin_set_at timestamptz,
  intentos integer not null default 0,
  bloqueado_hasta timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.client_portal_auth enable row level security;

create table public.portal_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index portal_sessions_client_idx on public.portal_sessions (client_id);
alter table public.portal_sessions enable row level security;

create table public.portal_pin_resets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index portal_pin_resets_client_idx on public.portal_pin_resets (client_id);
alter table public.portal_pin_resets enable row level security;
