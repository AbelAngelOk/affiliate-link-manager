import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { products, slots } from "../db/schema.js";
import { getCurrentUserId } from "../auth/currentUser.js";

type SlotRow = {
  id: string;
  productId: string;
  dominio: string;
  priority: number;
  status: "active" | "broken";
};

// Un slot es un único link candidato (ver db/schema.ts). El "canal" que ve la
// app consumidora es el dominio: se agrupan los slots de un mismo producto
// por dominio y se muestra el estado agregado (activo si queda al menos un
// candidato activo en ese dominio) — la app nunca ve la cola de fallback
// interna, solo un botón por dominio con su cta_url estable.
function groupByDominio(slotRows: SlotRow[]) {
  const byDominio = new Map<string, SlotRow[]>();
  for (const s of slotRows) {
    const arr = byDominio.get(s.dominio) ?? [];
    arr.push(s);
    byDominio.set(s.dominio, arr);
  }
  return byDominio;
}

function toDominioDto(productId: string, dominio: string, candidatos: SlotRow[]) {
  const hayActivo = candidatos.some((s) => s.status === "active");
  return {
    dominio,
    status: hayActivo ? "active" : "unavailable",
    cta_url: `/r/${productId}/${encodeURIComponent(dominio)}`,
  };
}

export async function productsRoutes(fastify: FastifyInstance) {
  // GET /v1/products?app=&include_unavailable=
  // "app" es el nombre de la app (no hay entidad App propia, ver schema.ts) —
  // se filtra en memoria porque "apps" es un array JSON en la fila del
  // producto, no una tabla de join. A la escala de este proyecto (unas
  // pocas apps, decenas/cientos de productos por usuario) es perfectamente
  // suficiente, ver 03-stack-tecnologico.md.
  fastify.get<{
    Querystring: { app?: string; include_unavailable?: string };
  }>(
    "/products",
    {
      schema: {
        tags: ["productos"],
        summary: "Lista los productos de una app, con sus dominios (slots agrupados)",
        querystring: {
          type: "object",
          required: ["app"],
          properties: {
            app: { type: "string" },
            include_unavailable: { type: "string", enum: ["true", "false"] },
          },
        },
      },
    },
    async (request, reply) => {
      const { app: appName, include_unavailable: includeUnavailable } = request.query;
      const ownerUserId = await getCurrentUserId();

      const allProductRows = await db
        .select({
          id: products.id,
          titulo: products.titulo,
          descripcionCorta: products.descripcionCorta,
          imagenUrl: products.imagenUrl,
          apps: products.apps,
        })
        .from(products)
        .where(eq(products.ownerUserId, ownerUserId));

      const productRows = allProductRows.filter((p) => p.apps.includes(appName as string));
      if (productRows.length === 0) return reply.send([]);

      const productIds = productRows.map((p) => p.id);
      const slotRows = (await db.select().from(slots)) as SlotRow[];
      const slotsByProduct = new Map<string, SlotRow[]>();
      for (const s of slotRows) {
        if (!productIds.includes(s.productId)) continue;
        const arr = slotsByProduct.get(s.productId) ?? [];
        arr.push(s);
        slotsByProduct.set(s.productId, arr);
      }

      return reply.send(
        productRows.map((p) => {
          const dominios = groupByDominio(slotsByProduct.get(p.id) ?? []);
          const dominioDtos = Array.from(dominios.entries())
            .map(([dominio, candidatos]) => toDominioDto(p.id, dominio, candidatos))
            .filter((d) => includeUnavailable === "true" || d.status === "active");

          return {
            id: p.id,
            titulo: p.titulo,
            descripcion_corta: p.descripcionCorta,
            imagen_url: p.imagenUrl,
            slots: dominioDtos,
          };
        }),
      );
    },
  );

  // GET /v1/products/:id/slots?dominio=&include_unavailable=
  fastify.get<{
    Params: { id: string };
    Querystring: { dominio?: string; include_unavailable?: string };
  }>(
    "/products/:id/slots",
    {
      schema: {
        tags: ["productos"],
        summary: "Filtra los dominios de un producto (ej. amazon.com.mx, mercadolibre.com.ar)",
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
        querystring: {
          type: "object",
          properties: {
            dominio: { type: "string" },
            include_unavailable: { type: "string", enum: ["true", "false"] },
          },
        },
      },
    },
    async (request, reply) => {
      const { id: productId } = request.params;
      const { dominio, include_unavailable: includeUnavailable } = request.query;
      const ownerUserId = await getCurrentUserId();

      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.ownerUserId, ownerUserId)));

      if (!product) return reply.code(404).send({ error: "product_not_found" });

      const conditions = [eq(slots.productId, productId)];
      if (dominio) conditions.push(eq(slots.dominio, dominio));

      const slotRows = (await db.select().from(slots).where(and(...conditions))) as SlotRow[];
      const dominios = groupByDominio(slotRows);
      const dominioDtos = Array.from(dominios.entries())
        .map(([d, candidatos]) => toDominioDto(productId, d, candidatos))
        .filter((d) => includeUnavailable === "true" || d.status === "active");

      return reply.send(dominioDtos);
    },
  );
}
