-- Campo libre al final de Evaluación para el diagnóstico kinésico —
-- opcional, solo aplica cuando el caso es una rehabilitación (no todo
-- cliente tiene uno). Mismo criterio que motivo_consulta (0009): texto
-- largo, no estructurado.
alter table public.clients
  add column diagnostico_kinesico text not null default '';
