import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { signAccessToken, ACCESS_TOKEN_EXPIRES_IN_SECONDS } from "../auth/jwt.js";

type AuthBody = { email: string; password: string };

const authBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8, maxLength: 200 },
  },
} as const;

function tokenResponse(userId: string) {
  return signAccessToken(userId).then((accessToken) => ({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  }));
}

// Un mismo registro sirve para las dos formas de usar el sistema (ver
// 01-solucion-final.md §3): el dashboard guarda el access_token en una
// cookie httpOnly, y cualquier consumidor directo de la API lo usa como
// Bearer token — no hay conceptos de "tenant"/"client" separados, cada
// usuario registrado es dueño de sus propios products.
export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: AuthBody }>(
    "/auth/register",
    {
      schema: {
        tags: ["auth"],
        summary: "Crea una cuenta y devuelve un access token",
        security: [],
        body: authBodySchema,
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (existing) return reply.code(409).send({ error: "email_taken" });

      const [user] = await db
        .insert(users)
        .values({ email, passwordHash: await hashPassword(password) })
        .returning();

      return reply.code(201).send(await tokenResponse(user.id));
    },
  );

  fastify.post<{ Body: AuthBody }>(
    "/auth/login",
    {
      schema: {
        tags: ["auth"],
        summary: "Intercambia email+contraseña por un access token",
        security: [],
        body: authBodySchema,
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const [user] = await db.select().from(users).where(eq(users.email, email));
      // Mismo error para "no existe" y "contraseña incorrecta" — no dar
      // pistas de qué emails están registrados.
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return reply.code(401).send({ error: "invalid_credentials" });
      }

      return reply.send(await tokenResponse(user.id));
    },
  );
}
