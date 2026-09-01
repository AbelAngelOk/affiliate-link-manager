import type { FastifyInstance } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { slotLinks } from "../db/schema.js";

// Público, sin auth: es el link que va en el href del botón real de la app.
// No valida el link "en vivo" en cada click (ver 01-solucion-final.md §4) —
// confía en el último estado que dejó el verificador periódico (Etapa 7).
export async function redirectRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { slotId: string } }>(
    "/r/:slotId",
    {
      schema: {
        tags: ["redirect"],
        summary: "Redirige al link de afiliado vigente de un slot (público, sin auth)",
        security: [],
      },
    },
    async (request, reply) => {
      const { slotId } = request.params;

      const [link] = await db
        .select({ affiliateUrl: slotLinks.affiliateUrl })
        .from(slotLinks)
        .where(and(eq(slotLinks.slotId, slotId), eq(slotLinks.status, "active")))
        .orderBy(asc(slotLinks.priority))
        .limit(1);

      if (!link) {
        return reply.code(410).send({ error: "slot_unavailable" });
      }

      return reply.redirect(link.affiliateUrl, 302);
    },
  );
}
