// Edad y aviso de cumpleaños a partir de `clients.fecha_nacimiento`.

export function calcularEdad(fechaNacimiento: string | null | undefined, hoy: Date = new Date()): number | null {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento + "T00:00:00");
  if (isNaN(nacimiento.getTime())) return null;

  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumplioEsteAno =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumplioEsteAno) edad -= 1;
  return edad;
}

// Días hasta el próximo cumpleaños (0 = hoy), sin importar el año de
// nacimiento — siempre mira hacia adelante desde `hoy`.
export function diasHastaCumpleanos(fechaNacimiento: string, hoy: Date = new Date()): number | null {
  const nacimiento = new Date(fechaNacimiento + "T00:00:00");
  if (isNaN(nacimiento.getTime())) return null;

  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const proximo = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  if (proximo < hoySinHora) proximo.setFullYear(proximo.getFullYear() + 1);

  return Math.round((proximo.getTime() - hoySinHora.getTime()) / (24 * 60 * 60 * 1000));
}
