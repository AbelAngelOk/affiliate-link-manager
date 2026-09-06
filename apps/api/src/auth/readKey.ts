import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "rlk_"; // read-link-key — distingue a simple vista de un JWT o una contraseña

export function generateReadKey(): string {
  return `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

// Sin salt, a diferencia de auth/password.ts: la key ya nace con 256 bits de
// entropía (no es algo que un usuario elige ni reutiliza entre sitios), así
// que un hash simple es seguro contra fuerza bruta/rainbow tables, y permite
// buscar la fila directo por `key_hash` en vez de tener que recorrer todas
// las keys existentes intentando verificar una por una.
export function hashReadKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
