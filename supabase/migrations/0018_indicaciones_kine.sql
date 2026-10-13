-- Indicaciones de kinesiología: notas del profesional para el cliente (ej.
-- "si te duele al saltar, suspendé esa actividad por ahora y seguí con las
-- demás") + un PDF opcional que el cliente puede abrir desde su portal.
-- Vive en plan_kine (una por cliente) pero NO sigue el mecanismo de
-- "Compartir" de los días/ejercicios — es contenido informativo, se guarda
-- y se ve de inmediato en el portal.
alter table public.plan_kine
  add column indicaciones_texto text not null default '',
  add column indicaciones_pdf_path text,
  add column indicaciones_pdf_nombre text;

-- Bucket de Storage para los PDF — público: igual criterio de acceso que el
-- resto del portal del cliente (sin login propio, solo el link/token), no
-- son datos de identificación, son indicaciones generales.
insert into storage.buckets (id, name, public)
values ('indicaciones', 'indicaciones', true)
on conflict (id) do nothing;

create policy "indicaciones_lectura_publica"
  on storage.objects for select
  to public
  using (bucket_id = 'indicaciones');

create policy "indicaciones_escritura_autenticados"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'indicaciones')
  with check (bucket_id = 'indicaciones');
