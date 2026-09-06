import type { FastifyInstance } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { products, productTypeFields, productFieldValues } from "../../db/schema.js";

type SaveValuesBody = { values: Record<string, string> };

// Valores de los campos del tipo asignado a un producto puntual (ver
// db/schema.ts). No existen si el producto no tiene productTypeId — en ese
// caso ambos endpoints devuelven simplemente una lista vacía, no error.
export async function adminProductFieldValuesRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>(
    "/products/:id/field-values",
    {
      schema: {
        tags: ["admin"],
        summary: "Trae los campos del tipo asignado a un producto, con su valor actual (o vacío si no se cargó)",
      },
    },
    async (request, reply) => {
      const [product] = await db
        .select({ id: products.id, productTypeId: products.productTypeId })
        .from(products)
        .where(and(eq(products.id, request.params.id), eq(products.ownerUserId, request.userId)));
      if (!product) return reply.code(404).send({ error: "product_not_found" });
      if (!product.productTypeId) return [];

      const fields = await db
        .select()
        .from(productTypeFields)
        .where(eq(productTypeFields.productTypeId, product.productTypeId))
        .orderBy(asc(productTypeFields.position));

      const values = await db
        .select()
        .from(productFieldValues)
        .where(eq(productFieldValues.productId, product.id));
      const valueByFieldId = new Map(values.map((v) => [v.productTypeFieldId, v.value]));

      return fields.map((f) => ({ ...f, value: valueByFieldId.get(f.id) ?? "" }));
    },
  );

  fastify.put<{ Params: { id: string }; Body: SaveValuesBody }>(
    "/products/:id/field-values",
    {
      schema: {
        tags: ["admin"],
        summary: "Guarda los valores de los campos del tipo asignado a un producto",
        body: {
          type: "object",
          required: ["values"],
          properties: { values: { type: "object", additionalProperties: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const [product] = await db
        .select({ id: products.id, productTypeId: products.productTypeId })
        .from(products)
        .where(and(eq(products.id, request.params.id), eq(products.ownerUserId, request.userId)));
      if (!product) return reply.code(404).send({ error: "product_not_found" });
      if (!product.productTypeId) return reply.code(422).send({ error: "product_has_no_type" });

      const fields = await db
        .select()
        .from(productTypeFields)
        .where(eq(productTypeFields.productTypeId, product.productTypeId));
      const fieldById = new Map(fields.map((f) => [f.id, f]));

      for (const [fieldId, value] of Object.entries(request.body.values)) {
        if (!fieldById.has(fieldId)) return reply.code(422).send({ error: "invalid_field", field_id: fieldId });
        if (fieldById.get(fieldId)!.required && !value.trim()) {
          return reply.code(422).send({ error: "missing_required_field", field_id: fieldId });
        }
      }
      for (const field of fields) {
        if (field.required && !request.body.values[field.id]?.trim()) {
          return reply.code(422).send({ error: "missing_required_field", field_id: field.id });
        }
      }

      // Reemplazo simple: borra los valores existentes de este producto y
      // vuelve a insertar los nuevos — alcanza a esta escala (unos pocos
      // campos por producto) sin necesitar un upsert fila por fila.
      await db.delete(productFieldValues).where(eq(productFieldValues.productId, product.id));
      const rows = Object.entries(request.body.values)
        .filter(([, value]) => value.trim().length > 0)
        .map(([fieldId, value]) => ({ productId: product.id, productTypeFieldId: fieldId, value }));
      if (rows.length > 0) await db.insert(productFieldValues).values(rows);

      return reply.code(204).send();
    },
  );
}
