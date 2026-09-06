import type { FastifyInstance } from "fastify";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { productTypes, productTypeFields } from "../../db/schema.js";

const plainText = (maxLength: number, minLength = 1) => ({
  type: "string",
  minLength,
  maxLength,
  pattern: "^[^<>]*$",
});

type CreateTypeBody = { name: string };
type CreateFieldBody = { name: string; field_type?: "text" | "textarea"; required?: boolean };

// "Tipo de producto" con campos definibles por el usuario (ver
// 01-solucion-final.md §2 y db/schema.ts) — a diferencia de Products/Slots,
// esto lo crea y edita el propio usuario desde el dashboard, no requiere un
// cambio de código para agregar un tipo nuevo.
export async function adminProductTypesRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/product-types",
    { schema: { tags: ["admin"], summary: "Lista tus tipos de producto, con sus campos" } },
    async (request) => {
      const types = await db.select().from(productTypes).where(eq(productTypes.ownerUserId, request.userId));
      const fields = await db
        .select()
        .from(productTypeFields)
        .innerJoin(productTypes, eq(productTypes.id, productTypeFields.productTypeId))
        .where(eq(productTypes.ownerUserId, request.userId))
        .orderBy(asc(productTypeFields.position));

      return types.map((t) => ({
        ...t,
        fields: fields.filter((f) => f.product_type_fields.productTypeId === t.id).map((f) => f.product_type_fields),
      }));
    },
  );

  fastify.post<{ Body: CreateTypeBody }>(
    "/product-types",
    {
      schema: {
        tags: ["admin"],
        summary: "Crea un tipo de producto (ej. libro)",
        body: { type: "object", required: ["name"], properties: { name: plainText(60) } },
      },
    },
    async (request, reply) => {
      const [created] = await db
        .insert(productTypes)
        .values({ ownerUserId: request.userId, name: request.body.name })
        .returning();
      return reply.code(201).send({ ...created, fields: [] });
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/product-types/:id",
    { schema: { tags: ["admin"], summary: "Borra un tipo de producto (los productos que lo tenían quedan sin tipo)" } },
    async (request, reply) => {
      const [deleted] = await db
        .delete(productTypes)
        .where(and(eq(productTypes.id, request.params.id), eq(productTypes.ownerUserId, request.userId)))
        .returning({ id: productTypes.id });
      if (!deleted) return reply.code(404).send({ error: "product_type_not_found" });
      return reply.code(204).send();
    },
  );

  fastify.post<{ Params: { id: string }; Body: CreateFieldBody }>(
    "/product-types/:id/fields",
    {
      schema: {
        tags: ["admin"],
        summary: "Agrega un campo a un tipo de producto (ej. autor)",
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: plainText(60),
            field_type: { type: "string", enum: ["text", "textarea"], default: "text" },
            required: { type: "boolean", default: false },
          },
        },
      },
    },
    async (request, reply) => {
      const [type] = await db
        .select({ id: productTypes.id })
        .from(productTypes)
        .where(and(eq(productTypes.id, request.params.id), eq(productTypes.ownerUserId, request.userId)));
      if (!type) return reply.code(404).send({ error: "product_type_not_found" });

      const [{ max }] = await db
        .select({ max: sql<number | null>`max(${productTypeFields.position})` })
        .from(productTypeFields)
        .where(eq(productTypeFields.productTypeId, type.id));

      const [created] = await db
        .insert(productTypeFields)
        .values({
          productTypeId: type.id,
          name: request.body.name,
          fieldType: request.body.field_type ?? "text",
          required: request.body.required ?? false,
          position: (max ?? -1) + 1,
        })
        .returning();
      return reply.code(201).send(created);
    },
  );

  fastify.delete<{ Params: { id: string; fieldId: string } }>(
    "/product-types/:id/fields/:fieldId",
    { schema: { tags: ["admin"], summary: "Borra un campo de un tipo (borra también los valores cargados con él)" } },
    async (request, reply) => {
      const [owned] = await db
        .select({ id: productTypeFields.id })
        .from(productTypeFields)
        .innerJoin(productTypes, eq(productTypes.id, productTypeFields.productTypeId))
        .where(
          and(
            eq(productTypeFields.id, request.params.fieldId),
            eq(productTypeFields.productTypeId, request.params.id),
            eq(productTypes.ownerUserId, request.userId),
          ),
        );
      if (!owned) return reply.code(404).send({ error: "field_not_found" });

      await db.delete(productTypeFields).where(eq(productTypeFields.id, request.params.fieldId));
      return reply.code(204).send();
    },
  );
}
