import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import { hashPassword, verifyPassword } from "../../auth/password.js";

type ChangePasswordBody = { current_password: string; new_password: string };

// Cambiar contraseña estando logueado (ver 04-alcance-y-limitaciones.md
// §"Multi-tenant" — era una limitación anotada). Recuperación por "olvidé mi
// contraseña" sigue sin resolver: requiere elegir un proveedor de envío de
// email, que no está en el stack todavía.
export async function adminAccountRoutes(fastify: FastifyInstance) {
  fastify.patch<{ Body: ChangePasswordBody }>(
    "/password",
    {
      schema: {
        tags: ["admin"],
        summary: "Cambia tu contraseña (requiere la actual)",
        body: {
          type: "object",
          required: ["current_password", "new_password"],
          properties: {
            current_password: { type: "string" },
            new_password: { type: "string", minLength: 8, maxLength: 200 },
          },
        },
      },
    },
    async (request, reply) => {
      const { current_password: currentPassword, new_password: newPassword } = request.body;

      const [user] = await db.select().from(users).where(eq(users.id, request.userId));
      if (!(await verifyPassword(currentPassword, user.passwordHash))) {
        return reply.code(401).send({ error: "invalid_credentials" });
      }

      await db.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, user.id));
      return reply.code(204).send();
    },
  );
}
