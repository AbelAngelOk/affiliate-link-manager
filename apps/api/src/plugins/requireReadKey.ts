import type { FastifyReply, FastifyRequest } from "fastify";
import { isNull, eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { readApiKeys } from "../db/schema.js";
import { hashReadKey } from "../auth/readKey.js";

// Gatea `/v1/*` (lectura, consumida por las apps — ver
// 01-solucion-final.md §3). Deliberadamente separado de requireAuth.ts: una
// app que se integra una vez necesita que esto siga andando indefinidamente,
// sin depender del JWT de sesión (30 días, pensado para un humano
// logueándose en el dashboard). La key se genera ahí — con sesión — pero
// usarla en runtime no requiere ningún login.
export async function requireReadKey(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "unauthorized" });
  }
  const key = header.slice("Bearer ".length);

  const [row] = await db
    .select({ userId: readApiKeys.userId })
    .from(readApiKeys)
    .where(and(eq(readApiKeys.keyHash, hashReadKey(key)), isNull(readApiKeys.revokedAt)));

  if (!row) return reply.code(401).send({ error: "unauthorized" });
  request.userId = row.userId;
}
