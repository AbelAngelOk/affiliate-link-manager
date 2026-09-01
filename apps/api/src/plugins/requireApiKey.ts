import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";

// Hook de auth simple para v1 (single-tenant, ver 01-solucion-final.md §3).
// Se registra con `fastify.addHook('onRequest', requireApiKey)` directamente
// dentro del mismo contexto que las rutas que protege (ver server.ts) — si se
// registrara como plugin aparte con `.register()`, Fastify lo encapsularía en
// un contexto hijo propio y el hook NO se aplicaría a las rutas hermanas.
export async function requireApiKey(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const expected = `Bearer ${config.apiKey}`;

  if (header !== expected) {
    return reply.code(401).send({ error: "unauthorized" });
  }
}
