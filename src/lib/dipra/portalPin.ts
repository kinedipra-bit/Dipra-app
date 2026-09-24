import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEYLEN = 64;

export function pinValido(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

// scrypt + salt propia por PIN — nunca se guarda en texto plano. No
// reemplaza tener un PIN de más dígitos, pero evita que un dump de la base
// muestre los PIN directamente.
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, KEYLEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verificarPin(pin: string, almacenado: string): boolean {
  const [saltHex, hashHex] = almacenado.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const esperado = Buffer.from(hashHex, "hex");
  const real = scryptSync(pin, salt, esperado.length);
  return real.length === esperado.length && timingSafeEqual(real, esperado);
}

// El token de reseteo por correo tiene alta entropía (256 bits) — a
// diferencia del PIN, un hash simple (sin salt/KDF lenta) alcanza.
export function generarTokenReset(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashTokenReset(token) };
}

export function hashTokenReset(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function enmascararCorreo(correo: string): string {
  const [user, domain] = correo.split("@");
  if (!domain) return correo;
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(user.length - visible.length, 1))}@${domain}`;
}
