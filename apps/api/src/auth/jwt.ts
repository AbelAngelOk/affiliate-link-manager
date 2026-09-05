import { SignJWT, jwtVerify } from "jose";
import { config } from "../config.js";

const secretKey = new TextEncoder().encode(config.jwtSecret);

// 30 días: el mismo token se guarda en la cookie httpOnly del dashboard (ver
// apps/dashboard/app/api/session/route.ts) y se usa directo como Bearer para
// llamar a la API — no hay refresh token todavía (ver
// 04-alcance-y-limitaciones.md), así que la duración importa para no obligar
// a un re-login constante. No hay revocación: si un token se filtra, queda
// válido hasta que expira, sin importar si después se cambia la contraseña.
export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30;

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRES_IN_SECONDS}s`)
    .sign(secretKey);
}

export async function verifyAccessToken(token: string) {
  return jwtVerify(token, secretKey);
}
