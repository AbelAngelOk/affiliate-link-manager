import type { FastifyInstance } from "fastify";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { products, slots } from "../../db/schema.js";
import { checkSlots } from "../../checker/runCheck.js";

// Disparadores manuales del verificador (ver 06-verificacion-de-disponibilidad.md):
// el cron sigue corriendo /internal/check sobre todo, pero desde el panel el
// usuario puede validar a demanda con tres alcances distintos, todos
// reusando la misma lógica de checkSlots() (mismo umbral, misma
// auto-reparación, misma notificación que la corrida periódica).
export async function adminCheckRoutes(fastify: FastifyInstance) {
  // Un slot puntual.
  fastify.post<{ Params: { id: string } }>(
    "/slots/:id/check",
    { schema: { tags: ["admin"], summary: "Valida un slot puntual" } },
    async (request, reply) => {
      const ownerUserId = request.userId;

      const [row] = await db
        .select({ slot: slots })
        .from(slots)
        .innerJoin(products, eq(products.id, slots.productId))
        .where(and(eq(slots.id, request.params.id), eq(products.ownerUserId, ownerUserId)));
      if (!row) return reply.code(404).send({ error: "slot_not_found" });

      return checkSlots([row.slot]);
    },
  );

  // Todos los slots de un producto.
  fastify.post<{ Params: { id: string } }>(
    "/products/:id/check",
    { schema: { tags: ["admin"], summary: "Valida todos los slots de un producto" } },
    async (request, reply) => {
      const ownerUserId = request.userId;

      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, request.params.id), eq(products.ownerUserId, ownerUserId)));
      if (!product) return reply.code(404).send({ error: "product_not_found" });

      const productSlots = await db.select().from(slots).where(eq(slots.productId, product.id));
      return checkSlots(productSlots);
    },
  );

  // Todos los slots de todos los productos que tengan esa app asignada (no
  // hay entidad App propia — ver 01-solucion-final.md §2 — así que se
  // resuelve igual que el filtro público /v1/products?app=).
  fastify.post<{ Params: { name: string } }>(
    "/apps/:name/check",
    { schema: { tags: ["admin"], summary: "Valida todos los slots de todos los productos de una app" } },
    async (request) => {
      const ownerUserId = request.userId;
      const appName = decodeURIComponent(request.params.name);

      const userProducts = await db
        .select({ id: products.id, apps: products.apps })
        .from(products)
        .where(eq(products.ownerUserId, ownerUserId));
      const productIds = userProducts.filter((p) => p.apps.includes(appName)).map((p) => p.id);

      if (productIds.length === 0) {
        return { checked: 0, markedBroken: [], markedActiveAgain: [], dominiosNowUnavailable: [] };
      }

      const appSlots = await db.select().from(slots).where(inArray(slots.productId, productIds));
      return checkSlots(appSlots);
    },
  );
}
