import type { FastifyInstance } from "fastify";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { products, productImages } from "../../db/schema.js";
import { ASPECT_RATIO_KEYS, ImageValidationError, validateImageAspectRatio } from "../../media/imageValidation.js";

type CreateImageBody = { aspect_ratio: "1:1" | "2:3" | "4:5"; url: string };

// Imágenes adicionales de un producto, más allá de la portada (`imagen_url`,
// ver db/schema.ts). Los tres conjuntos por proporción son opcionales y cada
// uno admite varias imágenes — la proporción real del archivo se valida
// contra la declarada (media/imageValidation.ts) antes de guardarla.
export async function adminProductImagesRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>(
    "/products/:id/images",
    { schema: { tags: ["admin"], summary: "Lista las imágenes adicionales de un producto, agrupadas por proporción" } },
    async (request, reply) => {
      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, request.params.id), eq(products.ownerUserId, request.userId)));
      if (!product) return reply.code(404).send({ error: "product_not_found" });

      return db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(asc(productImages.aspectRatio), asc(productImages.position));
    },
  );

  fastify.post<{ Params: { id: string }; Body: CreateImageBody }>(
    "/products/:id/images",
    {
      schema: {
        tags: ["admin"],
        summary: "Agrega una imagen a un conjunto (1:1, 2:3 o 4:5) — valida la proporción real del archivo",
        body: {
          type: "object",
          required: ["aspect_ratio", "url"],
          properties: {
            aspect_ratio: { type: "string", enum: ASPECT_RATIO_KEYS },
            url: { type: "string", format: "uri" },
          },
        },
      },
    },
    async (request, reply) => {
      const productId = request.params.id;
      const { aspect_ratio: aspectRatio, url } = request.body;

      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.ownerUserId, request.userId)));
      if (!product) return reply.code(404).send({ error: "product_not_found" });

      try {
        await validateImageAspectRatio(url, aspectRatio);
      } catch (err) {
        if (err instanceof ImageValidationError) {
          return reply.code(422).send({ error: "invalid_image", message: err.message });
        }
        throw err;
      }

      const [{ max }] = await db
        .select({ max: sql<number | null>`max(${productImages.position})` })
        .from(productImages)
        .where(and(eq(productImages.productId, productId), eq(productImages.aspectRatio, aspectRatio)));

      const [created] = await db
        .insert(productImages)
        .values({ productId, aspectRatio, url, position: (max ?? -1) + 1 })
        .returning();
      return reply.code(201).send(created);
    },
  );

  fastify.delete<{ Params: { id: string; imageId: string } }>(
    "/products/:id/images/:imageId",
    { schema: { tags: ["admin"], summary: "Borra una imagen adicional" } },
    async (request, reply) => {
      const [owned] = await db
        .select({ id: productImages.id })
        .from(productImages)
        .innerJoin(products, eq(products.id, productImages.productId))
        .where(
          and(
            eq(productImages.id, request.params.imageId),
            eq(productImages.productId, request.params.id),
            eq(products.ownerUserId, request.userId),
          ),
        );
      if (!owned) return reply.code(404).send({ error: "image_not_found" });

      await db.delete(productImages).where(eq(productImages.id, request.params.imageId));
      return reply.code(204).send();
    },
  );
}
