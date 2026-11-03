-- Feedback del profesional sobre una sesión puntual — distinto de "revisada"
-- (que solo marca que ya se vio) y de `comentarios` (lo que escribe el
-- cliente). El cliente lo lee en su histórico del portal.
alter table public.sesiones
  add column comentario_profesional text not null default '';
