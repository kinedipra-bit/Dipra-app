# DIPRA — Traspaso a Claude Code

## Qué es esto
Software de gestión para DIPRA (centro de entrenamiento y kinesiología integral, Maipú, Santiago). Construido en conversación con Claude (chat) como un prototipo funcional de un solo archivo React (`dipra-app.jsx`). Ya está validado en uso real con 3 clientes piloto y varias rondas de correcciones.

**Objetivo de esta etapa en Claude Code:** llevarlo de "artefacto de chat" a una app real desplegada, funcional para trabajar con al menos un cliente real, como prototipo para mostrar (incluyendo a un conocido informático de Nicolás que revisará la seguridad antes de un uso más amplio).

## Estado actual (qué ya funciona)
Todo esto vive en `dipra-app.jsx`, un componente React único:

- **Acceso**: pantalla de entrada con Admin/Profesional vs Atleta/Usuario (sin login real todavía — el atleta solo elige su nombre de una lista).
- **Clientes**: alta, ficha con datos personales, antecedentes clínicos completos (mórbidos, Qx, partos, hormonal, crónicas, respiratorios, sistémicos, neurológicos, cardíacos, cáncer, deporte, lesiones), campos adicionales personalizables.
- **Evaluación**: Pilares del rendimiento, Composición corporal (talla/peso/IMC/%grasa/etc. con histórico por fecha), FMS completo (7 tests, D/I, clearing tests, cálculo de score final, sugerencias automáticas de seguimiento cuando hay 0/1/2, campo para que el profesional agregue su propio criterio), evaluación del dolor (mnemotecnia ALICIA), movilidad por esferas (cráneo/tórax/pelvis/tobillo, patrones definidos libremente), evaluaciones específicas agregables (Up and go, unipodal, etc.), evaluación de rendimiento (fuerza, saltos con cálculo de déficit explosivo CMJ/SJ, fuerza funcional — agarre, dead hang, pull ups, push up, planchas, pararse del suelo).
- **Planificación**: múltiples semanas por cliente (histórico de mesociclos), bloques de ejercicios editables (agregar/renombrar/eliminar/insertar entre bloques), biblioteca de ejercicios con autocompletar y links de YouTube, campos RPE/RIR/TUT/descanso, comentario del cliente por ejercicio, vista de solo-edición y vista de resumen (día/semana), barra de carga semanal, resumen de FMS colapsable arriba de la planificación.
- **Sesiones**: registro por sesión (tipo, comentarios pre-sesión, pilares con escala 1-10 semaforizada — incluye el caso especial de estrés invertido —, ejecución real vs. planificada, comentarios post-sesión).
- **Agenda**: crear/ver citas por día, estados (confirmada/alerta/pendiente/cancelada).
- **Portal del cliente**: vista de solo lectura de su rutina, sesiones y progreso, más comentarios editables por ejercicio.
- **Identidad visual**: logo real de DIPRA, paleta verde/negro de la marca.

## Limitaciones conocidas (a resolver en Claude Code)
1. **Persistencia**: usa `window.storage` (almacenamiento simple tipo key-value del entorno de artefactos), no una base de datos real. Todo un negocio comparte una sola "cuenta" de datos.
2. **Sin autenticación real**: el rol Admin/Profesional no tiene contraseña; el Atleta solo elige su nombre de una lista.
3. **Condición de carrera parcialmente mitigada**: las operaciones de "agregar" (cliente, cita, ejercicio a biblioteca) usan una función (`persistMerge`) que relee lo último guardado antes de escribir, para no pisar cambios de otra sesión. Pero **editar el mismo registro en simultáneo desde dos sesiones todavía puede perder datos** — esto necesita una base de datos real con actualizaciones atómicas. Por eso Nicolás y Tefi acordaron usar una sola cuenta por ahora y no editar el mismo cliente a la vez.
4. **Migración de datos**: hay una función `migrarCliente()` que repara datos guardados con versiones anteriores del esquema (agrega campos que no existían antes) — si se cambia la forma de los datos de cliente en Claude Code, hay que decidir si se necesita algo similar para no perder los datos ya cargados.
5. **No hay multi-profesional**: está pensado para una sola cuenta compartida.
6. **No hay pagos** integrados (se recomendó, cuando corresponda, usar un link de pago de Mercado Pago/Webpay en vez de procesar pagos propios).
7. **No es instalable como app móvil** todavía — sería un buen candidato para PWA (más simple y rápido que una app nativa).

## Nota técnica para quien retome el código
Durante el desarrollo en chat hubo un bug real por una etiqueta JSX (`</div>`) de más, sin correspondencia de apertura, que costó varias rondas de diagnóstico porque el conteo simple de `{}`/`()` no lo detecta. Vale la pena, antes de cada entrega, validar con un parser real (ej. `esbuild.transformSync(src, { loader: 'jsx' })`) en vez de solo revisar visualmente — con Claude Code esto es mucho más fácil porque se puede correr la app y ver errores reales al vuelo.

## Lo que probablemente pida Nicolás a continuación
- Terminar de pulir funciones existentes (puede haber pedidos sueltos que no alcanzamos a cerrar).
- Base de datos real + login por profesional con permisos.
- Despliegue real (con URL propia) para poder compartir el link.
- Eventualmente: multi-profesional, agenda sincronizable, pagos.

## Cómo seguir
1. Abre Claude Code en la carpeta del proyecto (o crea una nueva).
2. Copia `dipra-app.jsx` como punto de partida.
3. Prompt sugerido para arrancar:

> "Este es un prototipo funcional de una app de gestión para un centro de kinesiología (DIPRA), construido como un solo componente React dentro de un chat con Claude. Necesito convertirlo en una app real: [elegir stack], con base de datos real, login por profesional, y desplegada para poder compartir el link. Este archivo adjunto (`dipra-app.jsx`) tiene toda la lógica de negocio ya validada — úsalo como referencia del comportamiento esperado, no lo reescribas desde cero sin necesidad."

4. Decidir stack con Claude Code (por ejemplo: Next.js + una base de datos como Supabase/Postgres, que resuelve base de datos + auth + hosting en un solo servicio, es una opción rápida y razonable para este tamaño de proyecto).
