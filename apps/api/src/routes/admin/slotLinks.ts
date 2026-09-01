import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { products, slotLinks, slots } from "../../db/schema.js";
import { getCurrentUserId } from "../../auth/currentUser.js";

async function assertSlotOwnedByCurrentUser(slotId: string) {
  const ownerUserId = await getCurrentUserId();
  const [owned] = await db
    .select({ id: slots.id })
    .from(slots)
    .innerJoin(products, eq(products.id, slots.productId))
    .where(and(eq(slots.id, slotId), eq(products.ownerUserId, ownerUserId)));
  return Boolean(owned);
}

export async function adminSlotLinksRoutes(fastify: FastifyInstance) {
  // Alta de un candidato en la cola de un slot (ver 01-solucion-final.md §2).
  fastify.post<{ Params: { id: string }; Body: { affiliate_url: string; priority?: number } }>(
    "/slots/:id/links",
    {
      schema: {
        tags: ["admin"],
        summary: "Agrega un link candidato a la cola de un slot",
        body: {
          type: "object",
          required: ["affiliate_url"],
          properties: {
            affiliate_url: { type: "string", format: "uri" },
            priority: { type: "integer", minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const slotId = request.params.id;
      if (!(await assertSlotOwnedByCurrentUser(slotId))) {
        return reply.code(404).send({ error: "slot_not_found" });
      }

      const [created] = await db
        .insert(slotLinks)
        .values({
          slotId,
          affiliateUrl: request.body.affiliate_url,
          priority: request.body.priority ?? 0,
        })
        .returning();
      return reply.code(201).send(created);
    },
  );

  // Editar prioridad/estado/URL a mano (ej. reactivar un link marcado
  // "broken" tras confirmarlo manualmente, o reordenar la cola).
  fastify.patch<{
    Params: { id: string };
    Body: Partial<{ affiliate_url: string; priority: number; status: "active" | "broken" }>;
  }>(
    "/slot-links/:id",
    {
      schema: {
        tags: ["admin"],
        summary: "Edita un link (URL, prioridad o estado)",
        body: {
          type: "object",
          properties: {
            affiliate_url: { type: "string", format: "uri" },
            priority: { type: "integer", minimum: 0 },
            status: { type: "string", enum: ["active", "broken"] },
          },
        },
      },
    },
    async (request, reply) => {
      const ownerUserId = await getCurrentUserId();
      const linkId = request.params.id;

      const [owned] = await db
        .select({ id: slotLinks.id })
        .from(slotLinks)
        .innerJoin(slots, eq(slots.id, slotLinks.slotId))
        .innerJoin(products, eq(products.id, slots.productId))
        .where(and(eq(slotLinks.id, linkId), eq(products.ownerUserId, ownerUserId)));
      if (!owned) return reply.code(404).send({ error: "slot_link_not_found" });

      const b = request.body;
      const patch: Record<string, unknown> = {};
      if (b.affiliate_url !== undefined) patch.affiliateUrl = b.affiliate_url;
      if (b.priority !== undefined) patch.priority = b.priority;
      if (b.status !== undefined) patch.status = b.status;

      const [updated] = await db.update(slotLinks).set(patch).where(eq(slotLinks.id, linkId)).returning();
      return updated;
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/slot-links/:id",
    { schema: { tags: ["admin"], summary: "Borra un link candidato" } },
    async (request, reply) => {
      const ownerUserId = await getCurrentUserId();
      const linkId = request.params.id;

      const [owned] = await db
        .select({ id: slotLinks.id })
        .from(slotLinks)
        .innerJoin(slots, eq(slots.id, slotLinks.slotId))
        .innerJoin(products, eq(products.id, slots.productId))
        .where(and(eq(slotLinks.id, linkId), eq(products.ownerUserId, ownerUserId)));
      if (!owned) return reply.code(404).send({ error: "slot_link_not_found" });

      await db.delete(slotLinks).where(eq(slotLinks.id, linkId));
      return reply.code(204).send();
    },
  );
}
