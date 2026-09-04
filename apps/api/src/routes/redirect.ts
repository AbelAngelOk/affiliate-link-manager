import type { FastifyInstance } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { slots } from "../db/schema.js";

// Público, sin auth: es el link que va en el href del botón real de la app.
// Clave por producto+dominio (no por el id de un slot puntual) para que la
// URL del botón quede estable aunque el candidato "vigente" cambie con el
// tiempo — ver 01-solucion-final.md §4.
//
// No valida el link "en vivo" en cada click (ver 01-solucion-final.md §4) —
// confía en el último estado que dejó el verificador periódico (Etapa 7).
export async function redirectRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { productId: string; dominio: string } }>(
    "/r/:productId/:dominio",
    {
      schema: {
        tags: ["redirect"],
        summary: "Redirige al link vigente de un producto+dominio (público, sin auth)",
        security: [],
      },
    },
    async (request, reply) => {
      const { productId, dominio } = request.params;

      const [slot] = await db
        .select({ affiliateUrl: slots.affiliateUrl })
        .from(slots)
        .where(and(eq(slots.productId, productId), eq(slots.dominio, dominio), eq(slots.status, "active")))
        .orderBy(asc(slots.priority))
        .limit(1);

      if (!slot) {
        return reply.code(410).send({ error: "dominio_unavailable" });
      }

      return reply.redirect(slot.affiliateUrl, 302);
    },
  );
}
