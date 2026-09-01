import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { apps } from "../../db/schema.js";
import { getCurrentUserId } from "../../auth/currentUser.js";

const appBodySchema = {
  type: "object",
  required: ["nombre", "bundle_id"],
  properties: {
    nombre: { type: "string", minLength: 1, maxLength: 100 },
    bundle_id: { type: "string", minLength: 1, maxLength: 150 },
    activo: { type: "boolean" },
  },
} as const;

export async function adminAppsRoutes(fastify: FastifyInstance) {
  fastify.get("/apps", { schema: { tags: ["admin"], summary: "Lista tus apps" } }, async () => {
    const ownerUserId = await getCurrentUserId();
    return db.select().from(apps).where(eq(apps.ownerUserId, ownerUserId));
  });

  fastify.post<{ Body: { nombre: string; bundle_id: string; activo?: boolean } }>(
    "/apps",
    { schema: { tags: ["admin"], summary: "Crea una app", body: appBodySchema } },
    async (request, reply) => {
      const ownerUserId = await getCurrentUserId();
      const [created] = await db
        .insert(apps)
        .values({
          ownerUserId,
          nombre: request.body.nombre,
          bundleId: request.body.bundle_id,
          activo: request.body.activo ?? true,
        })
        .returning();
      return reply.code(201).send(created);
    },
  );

  fastify.patch<{
    Params: { id: string };
    Body: Partial<{ nombre: string; bundle_id: string; activo: boolean }>;
  }>(
    "/apps/:id",
    {
      schema: {
        tags: ["admin"],
        summary: "Edita una app",
        body: { type: "object", properties: appBodySchema.properties },
      },
    },
    async (request, reply) => {
      const ownerUserId = await getCurrentUserId();
      const { id } = request.params;
      const patch: Record<string, unknown> = {};
      if (request.body.nombre !== undefined) patch.nombre = request.body.nombre;
      if (request.body.bundle_id !== undefined) patch.bundleId = request.body.bundle_id;
      if (request.body.activo !== undefined) patch.activo = request.body.activo;

      const [updated] = await db
        .update(apps)
        .set(patch)
        .where(and(eq(apps.id, id), eq(apps.ownerUserId, ownerUserId)))
        .returning();

      if (!updated) return reply.code(404).send({ error: "app_not_found" });
      return updated;
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/apps/:id",
    { schema: { tags: ["admin"], summary: "Borra una app" } },
    async (request, reply) => {
      const ownerUserId = await getCurrentUserId();
      const [deleted] = await db
        .delete(apps)
        .where(and(eq(apps.id, request.params.id), eq(apps.ownerUserId, ownerUserId)))
        .returning({ id: apps.id });

      if (!deleted) return reply.code(404).send({ error: "app_not_found" });
      return reply.code(204).send();
    },
  );
}
