import { createHash, randomBytes } from "node:crypto";

// Mismo criterio que auth/readKey.ts: el token nace con 256 bits de
// entropía, así que un hash simple (sin salt) alcanza y permite buscar la
// fila directo por `token_hash` en la tabla.
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
