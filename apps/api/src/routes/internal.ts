import type { FastifyInstance } from "fastify";
import { runCheck } from "../checker/runCheck.js";

// Protegido por requireAuth (ver app.ts) — en la práctica siempre con la API
// key root, es la única credencial de larga vida pensada para un cron.
// Corre sobre TODOS los slots de TODOS los tenants (ver checker/runCheck.ts):
// es una tarea de operación del sistema, no algo scoped a un tenant puntual.
// Pensado para que lo dispare el cron de GitHub Actions
// (05-plan-de-desarrollo.md, Etapa 7), no para uso interactivo frecuente.
export async function internalRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/check",
    { schema: { tags: ["admin"], summary: "Corre el verificador de disponibilidad" } },
    async () => runCheck(),
  );
}
