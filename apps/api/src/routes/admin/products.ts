import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { products } from "../../db/schema.js";
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

// No hay entidad App: alcanza con el nombre para identificarla, así que
// "apps" es un array de nombres directamente en el producto (ver schema.ts).
const appName = plainText(60);

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
    apps: { type: "array", items: appName, default: [] },
  },
} as const;

type ProductBody = {
  titulo: string;
  descripcion_corta: string;
  descripcion_larga?: string;
  imagen_url: string;
  imagen_alt?: string;
  categoria: string;
  apps?: string[];
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
          apps: b.apps ?? [],
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
        summary: "Edita un producto (incluye reemplazar la lista de apps)",
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
      if (b.apps !== undefined) patch.apps = b.apps;

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
}
