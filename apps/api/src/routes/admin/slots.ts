import type { FastifyInstance } from "fastify";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { products, slotLinks, slots } from "../../db/schema.js";
import { getCurrentUserId } from "../../auth/currentUser.js";

type CreateSlotBody = { provider: "amazon" | "mercadolibre"; country: string };

export async function adminSlotsRoutes(fastify: FastifyInstance) {
  // Vista para el dashboard (Etapa 9): todos los slots del usuario, con el
  // título del producto al que pertenecen — sirve tanto para listar todo
  // como para la pantalla de "productos/slots en alerta" (?status=unavailable).
  fastify.get<{ Querystring: { status?: "active" | "unavailable" | "checking" } }>(
    "/slots",
    {
      schema: {
        tags: ["admin"],
        summary: "Lista tus slots (con el producto al que pertenecen), opcionalmente filtrados por status",
        querystring: {
          type: "object",
          properties: { status: { type: "string", enum: ["active", "unavailable", "checking"] } },
        },
      },
    },
    async (request) => {
      const ownerUserId = await getCurrentUserId();
      const conditions = [eq(products.ownerUserId, ownerUserId)];
      if (request.query.status) conditions.push(eq(slots.status, request.query.status));

      return db
        .select({
          id: slots.id,
          productId: slots.productId,
          productTitulo: products.titulo,
          provider: slots.provider,
          country: slots.country,
          status: slots.status,
        })
        .from(slots)
        .innerJoin(products, eq(products.id, slots.productId))
        .where(and(...conditions));
    },
  );

  // Slots de un producto con sus links candidatos (para la pantalla de
  // detalle del dashboard) — a diferencia de /v1/products/:id/slots, esta
  // incluye todos los status y los SlotLink completos, no solo el cta_url.
  fastify.get<{ Params: { id: string } }>(
    "/products/:id/slots",
    { schema: { tags: ["admin"], summary: "Slots de un producto con sus links candidatos" } },
    async (request, reply) => {
      const ownerUserId = await getCurrentUserId();
      const productId = request.params.id;

      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.ownerUserId, ownerUserId)));
      if (!product) return reply.code(404).send({ error: "product_not_found" });

      const slotRows = await db.select().from(slots).where(eq(slots.productId, productId));
      if (slotRows.length === 0) return [];

      const linkRows = await db
        .select()
        .from(slotLinks)
        .where(
          inArray(
            slotLinks.slotId,
            slotRows.map((s) => s.id),
          ),
        );

      const linksBySlot = new Map<string, typeof linkRows>();
      for (const link of linkRows) {
        const arr = linksBySlot.get(link.slotId) ?? [];
        arr.push(link);
        linksBySlot.set(link.slotId, arr);
      }

      return slotRows.map((slot) => ({ ...slot, links: linksBySlot.get(slot.id) ?? [] }));
    },
  );

  // Slot = producto + proveedor + país (ver 01-solucion-final.md §2). No hay
  // PATCH: provider/country son la identidad del slot, no se editan una vez
  // creado — si hace falta otro canal, se crea un slot nuevo.
  fastify.post<{ Params: { id: string }; Body: CreateSlotBody }>(
    "/products/:id/slots",
    {
      schema: {
        tags: ["admin"],
        summary: "Crea un slot (proveedor + país) para un producto",
        body: {
          type: "object",
          required: ["provider", "country"],
          properties: {
            provider: { type: "string", enum: ["amazon", "mercadolibre"] },
            country: { type: "string", minLength: 2, maxLength: 5 },
          },
        },
      },
    },
    async (request, reply) => {
      const ownerUserId = await getCurrentUserId();
      const productId = request.params.id;

      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.ownerUserId, ownerUserId)));
      if (!product) return reply.code(404).send({ error: "product_not_found" });

      try {
        const [created] = await db
          .insert(slots)
          .values({
            productId,
            provider: request.body.provider,
            country: request.body.country,
          })
          .returning();
        return reply.code(201).send(created);
      } catch (err) {
        if (err instanceof Error && err.message.includes("UNIQUE")) {
          return reply.code(409).send({
            error: "slot_already_exists",
            message: `Ya existe un slot ${request.body.provider}:${request.body.country} para este producto.`,
          });
        }
        throw err;
      }
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/slots/:id",
    { schema: { tags: ["admin"], summary: "Borra un slot" } },
    async (request, reply) => {
      const ownerUserId = await getCurrentUserId();

      // Confirma que el slot pertenece a un producto del usuario actual antes
      // de borrar (queda listo para cuando haya más de un owner posible).
      const [owned] = await db
        .select({ id: slots.id })
        .from(slots)
        .innerJoin(products, eq(products.id, slots.productId))
        .where(and(eq(slots.id, request.params.id), eq(products.ownerUserId, ownerUserId)));
      if (!owned) return reply.code(404).send({ error: "slot_not_found" });

      await db.delete(slots).where(eq(slots.id, request.params.id));
      return reply.code(204).send();
    },
  );
}
