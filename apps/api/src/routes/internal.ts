import type { FastifyInstance } from "fastify";
import { runCheck } from "../checker/runCheck.js";

// Protegido por la misma API key (ver requireApiKey en app.ts). Pensado para
// que lo dispare el cron de GitHub Actions (ver 05-plan-de-desarrollo.md,
// Etapa 7), no para uso interactivo frecuente.
export async function internalRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/check",
    { schema: { tags: ["admin"], summary: "Corre el verificador de disponibilidad" } },
    async () => runCheck(),
  );
}
