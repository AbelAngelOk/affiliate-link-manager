import type { FastifyInstance } from "fastify";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { productApps, products, slots } from "../db/schema.js";
import { getCurrentUserId } from "../auth/currentUser.js";

type SlotRow = {
  id: string;
  productId: string;
  provider: "amazon" | "mercadolibre";
  country: string;
  status: "active" | "unavailable" | "checking";
};

function toSlotDto(s: SlotRow) {
  return {
    slot_id: s.id,
    provider: s.provider,
    country: s.country,
    status: s.status,
    cta_url: `/r/${s.id}`,
  };
}

export async function productsRoutes(fastify: FastifyInstance) {
  // GET /v1/products?app_id=&include_unavailable=
  fastify.get<{
    Querystring: { app_id?: string; include_unavailable?: string };
  }>(
    "/products",
    {
      schema: {
        tags: ["productos"],
        summary: "Lista los productos de una app, con sus slots activos",
        querystring: {
          type: "object",
          required: ["app_id"],
          properties: {
            app_id: { type: "string" },
            include_unavailable: { type: "string", enum: ["true", "false"] },
          },
        },
      },
    },
    async (request, reply) => {
      const { app_id: appId, include_unavailable: includeUnavailable } = request.query;
      const ownerUserId = await getCurrentUserId();

      const productRows = await db
        .select({
          id: products.id,
          titulo: products.titulo,
          descripcionCorta: products.descripcionCorta,
          imagenUrl: products.imagenUrl,
        })
        .from(products)
        .innerJoin(productApps, eq(productApps.productId, products.id))
        .where(and(eq(productApps.appId, appId as string), eq(products.ownerUserId, ownerUserId)));

      if (productRows.length === 0) return reply.send([]);

      const productIds = productRows.map((p) => p.id);
      const slotConditions =
        includeUnavailable === "true"
          ? inArray(slots.productId, productIds)
          : and(inArray(slots.productId, productIds), eq(slots.status, "active"));

      const slotRows = (await db
        .select({
          id: slots.id,
          productId: slots.productId,
          provider: slots.provider,
          country: slots.country,
          status: slots.status,
        })
        .from(slots)
        .where(slotConditions)) as SlotRow[];

      const slotsByProduct = new Map<string, SlotRow[]>();
      for (const s of slotRows) {
        const arr = slotsByProduct.get(s.productId) ?? [];
        arr.push(s);
        slotsByProduct.set(s.productId, arr);
      }

      return reply.send(
        productRows.map((p) => ({
          id: p.id,
          titulo: p.titulo,
          descripcion_corta: p.descripcionCorta,
          imagen_url: p.imagenUrl,
          slots: (slotsByProduct.get(p.id) ?? []).map(toSlotDto),
        })),
      );
    },
  );

  // GET /v1/products/:id/slots?provider=&country=&include_unavailable=
  fastify.get<{
    Params: { id: string };
    Querystring: { provider?: "amazon" | "mercadolibre"; country?: string; include_unavailable?: string };
  }>(
    "/products/:id/slots",
    {
      schema: {
        tags: ["productos"],
        summary: "Filtra los slots de un producto por proveedor/país",
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
        querystring: {
          type: "object",
          properties: {
            provider: { type: "string", enum: ["amazon", "mercadolibre"] },
            country: { type: "string" },
            include_unavailable: { type: "string", enum: ["true", "false"] },
          },
        },
      },
    },
    async (request, reply) => {
      const { id: productId } = request.params;
      const { provider, country, include_unavailable: includeUnavailable } = request.query;
      const ownerUserId = await getCurrentUserId();

      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.ownerUserId, ownerUserId)));

      if (!product) return reply.code(404).send({ error: "product_not_found" });

      const conditions = [eq(slots.productId, productId)];
      if (provider) conditions.push(eq(slots.provider, provider));
      if (country) conditions.push(eq(slots.country, country));
      if (includeUnavailable !== "true") conditions.push(eq(slots.status, "active"));

      const slotRows = (await db
        .select({
          id: slots.id,
          productId: slots.productId,
          provider: slots.provider,
          country: slots.country,
          status: slots.status,
        })
        .from(slots)
        .where(and(...conditions))) as SlotRow[];

      return reply.send(slotRows.map(toSlotDto));
    },
  );
}
