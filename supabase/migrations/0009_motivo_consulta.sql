-- Campo libre en Evaluación para el objetivo/motivo de consulta/anamnesis
-- inicial del cliente — texto largo, distinto del "objetivo" corto que ya
-- existe en Ficha (más orientado a la meta de entrenamiento).
alter table public.clients
  add column motivo_consulta text not null default '';
