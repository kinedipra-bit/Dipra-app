-- Catálogo real de prestaciones de Nicolás, con precios en CLP — la tabla
-- servicios (0014) existía pero estaba vacía, nadie la había cargado.
insert into public.servicios (nombre, tipo, precio, periodicidad, descripcion) values
  ('Evaluación', 'sesion', 20000, '', ''),
  ('Kine personalizada', 'sesion', 25000, '', ''),
  ('Pack kinesiología', 'plan', 250000, 'paquete', 'Evaluación + 10 sesiones'),
  ('Entrenamiento personalizado 2x/semana', 'plan', 160000, 'mensual', ''),
  ('Entrenamiento personalizado 3x/semana', 'plan', 210000, 'mensual', ''),
  ('Entrenamiento grupal 1x/semana', 'plan', 50000, 'mensual', ''),
  ('Entrenamiento grupal 2x/semana', 'plan', 90000, 'mensual', ''),
  ('Entrenamiento grupal 3x/semana', 'plan', 120000, 'mensual', ''),
  ('Sesión suelta', 'sesion', 12000, '', '');
