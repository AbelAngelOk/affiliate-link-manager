import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";

// Gatea únicamente /internal/* (el cron de GitHub Actions, ver
// 05-plan-de-desarrollo.md Etapa 7) — deliberadamente separado del login de
// usuarios (requireAuth.ts): un cron no es una persona logueándose, es un
// secreto de infraestructura fijo.
export async function requireInternalKey(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (header !== `Bearer ${config.internalKey}`) {
    return reply.code(401).send({ error: "unauthorized" });
  }
}
