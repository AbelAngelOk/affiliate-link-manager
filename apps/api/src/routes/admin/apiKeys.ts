import type { FastifyInstance } from "fastify";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/client.js";
import { readApiKeys } from "../../db/schema.js";
import { generateReadKey, hashReadKey } from "../../auth/readKey.js";

type CreateKeyBody = { name: string };

// Administración de las read API keys de `/v1/*` (ver
// 01-solucion-final.md §3 y plugins/requireReadKey.ts) — requiere sesión
// (JWT), es la parte que sí necesita estar logueado: elegir a qué cuenta
// pertenece la key que se va a generar.
export async function adminApiKeysRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api-keys",
    { schema: { tags: ["admin"], summary: "Lista tus read API keys (sin el valor, solo metadata)" } },
    async (request) => {
      return db
        .select({
          id: readApiKeys.id,
          name: readApiKeys.name,
          createdAt: readApiKeys.createdAt,
          revokedAt: readApiKeys.revokedAt,
        })
        .from(readApiKeys)
        .where(eq(readApiKeys.userId, request.userId));
    },
  );

  fastify.post<{ Body: CreateKeyBody }>(
    "/api-keys",
    {
      schema: {
        tags: ["admin"],
        summary: "Genera una read API key nueva para /v1/* — el valor se muestra una única vez",
        body: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string", minLength: 1, maxLength: 60 } },
        },
      },
    },
    async (request, reply) => {
      const key = generateReadKey();
      const [created] = await db
        .insert(readApiKeys)
        .values({ userId: request.userId, name: request.body.name, keyHash: hashReadKey(key) })
        .returning({ id: readApiKeys.id, name: readApiKeys.name, createdAt: readApiKeys.createdAt });

      return reply.code(201).send({ ...created, key });
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/api-keys/:id",
    { schema: { tags: ["admin"], summary: "Revoca una read API key" } },
    async (request, reply) => {
      const [revoked] = await db
        .update(readApiKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(readApiKeys.id, request.params.id),
            eq(readApiKeys.userId, request.userId),
            isNull(readApiKeys.revokedAt),
          ),
        )
        .returning({ id: readApiKeys.id });

      if (!revoked) return reply.code(404).send({ error: "key_not_found" });
      return reply.code(204).send();
    },
  );
}
