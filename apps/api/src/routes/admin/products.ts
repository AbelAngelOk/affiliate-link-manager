import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { apps, productApps, products } from "../../db/schema.js";
import { getCurrentUserId } from "../../auth/currentUser.js";

// Texto plano únicamente (rechaza < y >) y límites de longitud según
// 01-solucion-final.md §2.1 — se enforcean acá, en la escritura, para que
// cualquier app consumidora reciba siempre datos dentro de esos límites.
const plainText = (maxLength: number, minLength = 1) => ({
  type: "string",
  minLength,
  maxLength,
  pattern: "^[^<>]*$",
});

const productBodySchema = {
  type: "object",
  required: ["titulo", "descripcion_corta", "imagen_url", "categoria"],
  properties: {
    titulo: plainText(80),
    descripcion_corta: plainText(160),
    descripcion_larga: plainText(500, 0),
    imagen_url: { type: "string", format: "uri" },
    imagen_alt: plainText(125, 0),
    categoria: plainText(40),
  },
} as const;

type ProductBody = {
  titulo: string;
  descripcion_corta: string;
  descripcion_larga?: string;
  imagen_url: string;
  imagen_alt?: string;
  categoria: string;
};

export async function adminProductsRoutes(fastify: FastifyInstance) {
  fastify.get("/products", { schema: { tags: ["admin"], summary: "Lista tus productos" } }, async () => {
    const ownerUserId = await getCurrentUserId();
    return db.select().from(products).where(eq(products.ownerUserId, ownerUserId));
  });

  fastify.post<{ Body: ProductBody }>(
    "/products",
    { schema: { tags: ["admin"], summary: "Crea un producto", body: productBodySchema } },
    async (request, reply) => {
      const ownerUserId = await getCurrentUserId();
      const b = request.body;
      const [created] = await db
        .insert(products)
        .values({
          ownerUserId,
          titulo: b.titulo,
          descripcionCorta: b.descripcion_corta,
          descripcionLarga: b.descripcion_larga,
          imagenUrl: b.imagen_url,
          imagenAlt: b.imagen_alt,
          categoria: b.categoria,
        })
        .returning();
      return reply.code(201).send(created);
    },
  );

  fastify.patch<{ Params: { id: string }; Body: Partial<ProductBody> }>(
    "/products/:id",
    {
      schema: {
        tags: ["admin"],
        summary: "Edita un producto",
        body: { type: "object", properties: productBodySchema.properties },
      },
    },
    async (request, reply) => {
      const ownerUserId = await getCurrentUserId();
      const { id } = request.params;
      const b = request.body;
      const patch: Record<string, unknown> = {};
      if (b.titulo !== undefined) patch.titulo = b.titulo;
      if (b.descripcion_corta !== undefined) patch.descripcionCorta = b.descripcion_corta;
      if (b.descripcion_larga !== undefined) patch.descripcionLarga = b.descripcion_larga;
      if (b.imagen_url !== undefined) patch.imagenUrl = b.imagen_url;
      if (b.imagen_alt !== undefined) patch.imagenAlt = b.imagen_alt;
      if (b.categoria !== undefined) patch.categoria = b.categoria;

      const [updated] = await db
        .update(products)
        .set(patch)
        .where(and(eq(products.id, id), eq(products.ownerUserId, ownerUserId)))
        .returning();

      if (!updated) return reply.code(404).send({ error: "product_not_found" });
      return updated;
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/products/:id",
    { schema: { tags: ["admin"], summary: "Borra un producto" } },
    async (request, reply) => {
      const ownerUserId = await getCurrentUserId();
      const [deleted] = await db
        .delete(products)
        .where(and(eq(products.id, request.params.id), eq(products.ownerUserId, ownerUserId)))
        .returning({ id: products.id });

      if (!deleted) return reply.code(404).send({ error: "product_not_found" });
      return reply.code(204).send();
    },
  );

  // Asociación N:N producto <-> app (ver 01-solucion-final.md §2)
  fastify.post<{ Params: { id: string }; Body: { app_id: string } }>(
    "/products/:id/apps",
    {
      schema: {
        tags: ["admin"],
        summary: "Asocia un producto a una app",
        body: { type: "object", required: ["app_id"], properties: { app_id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const ownerUserId = await getCurrentUserId();
      const productId = request.params.id;
      const appId = request.body.app_id;

      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.ownerUserId, ownerUserId)));
      if (!product) return reply.code(404).send({ error: "product_not_found" });

      const [app] = await db
        .select({ id: apps.id })
        .from(apps)
        .where(and(eq(apps.id, appId), eq(apps.ownerUserId, ownerUserId)));
      if (!app) return reply.code(404).send({ error: "app_not_found" });

      await db.insert(productApps).values({ productId, appId }).onConflictDoNothing();
      return reply.code(204).send();
    },
  );

  fastify.delete<{ Params: { id: string; appId: string } }>(
    "/products/:id/apps/:appId",
    { schema: { tags: ["admin"], summary: "Desasocia un producto de una app" } },
    async (request, reply) => {
      await getCurrentUserId(); // valida que hay un usuario activo (ver nota en currentUser.ts)
      await db
        .delete(productApps)
        .where(
          and(eq(productApps.productId, request.params.id), eq(productApps.appId, request.params.appId)),
        );
      return reply.code(204).send();
    },
  );
}
