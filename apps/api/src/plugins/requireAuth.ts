import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../auth/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    // Id del usuario dueño de los recursos de este request — viene del
    // `sub` del JWT (ver auth/jwt.ts). Cada endpoint sigue filtrando por
    // `owner_user_id = request.userId`, igual que en v1.
    userId: string;
  }
}

// Auth por JWT (ver 01-solucion-final.md §3): el token se obtiene en
// POST /auth/login o /auth/register (email+contraseña) y se manda como
// `Authorization: Bearer <token>` — tanto desde el dashboard (que lo guarda
// en una cookie httpOnly) como desde cualquier consumidor directo de la API.
//
// Se registra con `fastify.addHook('onRequest', requireAuth)` directamente
// dentro del mismo contexto que las rutas que protege — si se registrara
// como plugin aparte con `.register()`, Fastify lo encapsularía en un
// contexto hijo propio y el hook NO se aplicaría a las rutas hermanas.
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "unauthorized" });
  }
  const token = header.slice("Bearer ".length);

  try {
    const { payload } = await verifyAccessToken(token);
    if (typeof payload.sub !== "string") throw new Error("token sin sub");
    request.userId = payload.sub;
  } catch {
    return reply.code(401).send({ error: "unauthorized" });
  }
}
