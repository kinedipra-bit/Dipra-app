-- Duración sugerida (en semanas) del mesociclo que está cursando la semana,
-- para armar la cuenta regresiva de fin de ciclo en Plan. Default 6 (rango
-- típico sugerido 5-8), editable por el profesional.
alter table public.plan_semanas
  add column duracion_semanas integer not null default 6;
