import type { FastifyInstance } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { products, slots } from "../../db/schema.js";
import { isActivePriorityTaken, makeRoomForPriority, nextPriorityFor } from "../../db/priority.js";

const plainText = (maxLength: number, minLength = 1) => ({
  type: "string",
  minLength,
  maxLength,
  pattern: "^[^<>]*$",
});

// Dominio real del canal (ej. "amazon.com.mx", "mercadolibre.com.ar") — ver
// db/schema.ts para por qué esto reemplaza a provider+country.
const dominioSchema = plainText(60, 3);

type CreateSlotBody = { dominio: string; affiliate_url: string; priority?: number };
type PatchSlotBody = Partial<{ affiliate_url: string; priority: number; status: "active" | "broken" }>;

export async function adminSlotsRoutes(fastify: FastifyInstance) {
  // Tablero global para el dashboard: todos los slots del usuario en una
  // sola lista plana, con el título del producto al que pertenece cada uno
  // (un slot no tiene ese dato propio, hace falta el join). Filtrable por
  // status real de la fila (active|broken) — ya no hay agregación por
  // dominio acá, eso quedó específico de /v1/products (ver routes/products.ts).
  fastify.get<{ Querystring: { status?: "active" | "broken" } }>(
    "/slots",
    {
      schema: {
        tags: ["admin"],
        summary: "Lista todos tus slots (tablero global), con el producto de cada uno",
        querystring: {
          type: "object",
          properties: { status: { type: "string", enum: ["active", "broken"] } },
        },
      },
    },
    async (request) => {
      const ownerUserId = request.userId;
      const conditions = [eq(products.ownerUserId, ownerUserId)];
      if (request.query.status) conditions.push(eq(slots.status, request.query.status));

      return db
        .select({
          id: slots.id,
          productId: slots.productId,
          productTitulo: products.titulo,
          dominio: slots.dominio,
          affiliateUrl: slots.affiliateUrl,
          priority: slots.priority,
          status: slots.status,
        })
        .from(slots)
        .innerJoin(products, eq(products.id, slots.productId))
        .where(and(...conditions))
        .orderBy(asc(products.titulo), asc(slots.dominio), asc(slots.priority));
    },
  );

  // Slots de un producto puntual (para la pantalla de detalle del
  // dashboard) — filas crudas, ordenadas por dominio y luego prioridad.
  fastify.get<{ Params: { id: string } }>(
    "/products/:id/slots",
    { schema: { tags: ["admin"], summary: "Lista los slots (links) de un producto" } },
    async (request, reply) => {
      const ownerUserId = request.userId;
      const productId = request.params.id;

      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.ownerUserId, ownerUserId)));
      if (!product) return reply.code(404).send({ error: "product_not_found" });

      return db
        .select()
        .from(slots)
        .where(eq(slots.productId, productId))
        .orderBy(asc(slots.dominio), asc(slots.priority));
    },
  );

  // Alta de un slot (link + prioridad) para un producto+dominio.
  // - Sin priority: se calcula sola como "el último de la cola" de ese dominio.
  // - Con priority explícita que ya está ocupada por un slot ACTIVO: en vez
  //   de rechazar el alta, se corre un lugar a ese y a los siguientes de la
  //   cola (insertar-y-empujar), y el nuevo slot toma esa prioridad.
  fastify.post<{ Params: { id: string }; Body: CreateSlotBody }>(
    "/products/:id/slots",
    {
      schema: {
        tags: ["admin"],
        summary: "Crea un slot (link candidato) para un dominio del producto",
        body: {
          type: "object",
          required: ["dominio", "affiliate_url"],
          properties: {
            dominio: dominioSchema,
            affiliate_url: { type: "string", format: "uri" },
            priority: { type: "integer", minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const ownerUserId = request.userId;
      const productId = request.params.id;
      const { dominio } = request.body;

      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.ownerUserId, ownerUserId)));
      if (!product) return reply.code(404).send({ error: "product_not_found" });

      const priority = request.body.priority ?? (await nextPriorityFor(productId, dominio));

      if (request.body.priority !== undefined && (await isActivePriorityTaken(productId, dominio, priority))) {
        await makeRoomForPriority(productId, dominio, priority);
      }

      const [created] = await db
        .insert(slots)
        .values({
          productId,
          dominio,
          affiliateUrl: request.body.affiliate_url,
          priority,
        })
        .returning();
      return reply.code(201).send(created);
    },
  );

  // Editar el link, la prioridad o reactivar/romper un slot a mano. No se
  // puede cambiar el dominio de un slot existente (cambiaría de canal) — si
  // hace falta, se borra y se crea uno nuevo en el dominio correcto.
  fastify.patch<{ Params: { id: string }; Body: PatchSlotBody }>(
    "/slots/:id",
    {
      schema: {
        tags: ["admin"],
        summary: "Edita un slot (link, prioridad o estado)",
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
      const ownerUserId = request.userId;
      const slotId = request.params.id;

      const [owned] = await db
        .select({ productId: slots.productId, dominio: slots.dominio, status: slots.status })
        .from(slots)
        .innerJoin(products, eq(products.id, slots.productId))
        .where(and(eq(slots.id, slotId), eq(products.ownerUserId, ownerUserId)));
      if (!owned) return reply.code(404).send({ error: "slot_not_found" });

      const b = request.body;
      const patch: Record<string, unknown> = {};
      if (b.affiliate_url !== undefined) patch.affiliateUrl = b.affiliate_url;
      if (b.priority !== undefined) patch.priority = b.priority;
      if (b.status !== undefined) patch.status = b.status;

      // Si el resultado de este patch deja al slot activo con una prioridad
      // que ya usa otro slot activo del mismo dominio, se le hace lugar
      // (insertar-y-empujar) en vez de romper el índice único parcial. A
      // diferencia del alta, acá el slot que se mueve YA ocupa un lugar en
      // la tabla — antes de correr a los demás hay que sacarlo del medio
      // (a una prioridad temporal fuera de rango), porque si no el corrimiento
      // choca contra su propio valor viejo (es un intercambio, no un insert).
      const resultStatus = b.status ?? owned.status;
      if (b.priority !== undefined && resultStatus === "active") {
        if (await isActivePriorityTaken(owned.productId, owned.dominio, b.priority, slotId)) {
          await db.update(slots).set({ priority: -1 }).where(eq(slots.id, slotId));
          await makeRoomForPriority(owned.productId, owned.dominio, b.priority, slotId);
        }
      }

      const [updated] = await db.update(slots).set(patch).where(eq(slots.id, slotId)).returning();
      return updated;
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/slots/:id",
    { schema: { tags: ["admin"], summary: "Borra un slot" } },
    async (request, reply) => {
      const ownerUserId = request.userId;

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
