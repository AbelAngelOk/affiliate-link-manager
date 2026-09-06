import type { FastifyInstance } from "fastify";
import { and, eq, isNull, gt } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, passwordResetTokens } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { signAccessToken, ACCESS_TOKEN_EXPIRES_IN_SECONDS } from "../auth/jwt.js";
import { generateResetToken, hashResetToken } from "../auth/resetToken.js";
import { sendPasswordResetEmail } from "../email/resend.js";
import { config } from "../config.js";

type AuthBody = { email: string; password: string };
type ForgotPasswordBody = { email: string };
type ResetPasswordBody = { token: string; new_password: string };

const RESET_TOKEN_EXPIRES_IN_MS = 60 * 60 * 1000;

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

  fastify.post<{ Body: ForgotPasswordBody }>(
    "/auth/forgot-password",
    {
      schema: {
        tags: ["auth"],
        summary: "Manda un link de recuperación por email si la cuenta existe",
        security: [],
        body: {
          type: "object",
          required: ["email"],
          properties: { email: { type: "string", format: "email" } },
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body;

      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      // Siempre 204, exista o no la cuenta — no dar pistas de qué emails
      // están registrados (mismo criterio que /auth/login).
      if (user) {
        const token = generateResetToken();
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash: hashResetToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRES_IN_MS),
        });
        const resetUrl = `${config.dashboardUrl}/reset-password?token=${token}`;
        await sendPasswordResetEmail(email, resetUrl);
      }

      return reply.code(204).send();
    },
  );

  fastify.post<{ Body: ResetPasswordBody }>(
    "/auth/reset-password",
    {
      schema: {
        tags: ["auth"],
        summary: "Canjea un token de recuperación por una contraseña nueva",
        security: [],
        body: {
          type: "object",
          required: ["token", "new_password"],
          properties: {
            token: { type: "string" },
            new_password: { type: "string", minLength: 8, maxLength: 200 },
          },
        },
      },
    },
    async (request, reply) => {
      const { token, new_password: newPassword } = request.body;

      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, hashResetToken(token)),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, new Date()),
          ),
        );
      if (!resetToken) return reply.code(401).send({ error: "invalid_or_expired_token" });

      await db
        .update(users)
        .set({ passwordHash: await hashPassword(newPassword) })
        .where(eq(users.id, resetToken.userId));
      await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetToken.id));

      return reply.code(204).send();
    },
  );
}
