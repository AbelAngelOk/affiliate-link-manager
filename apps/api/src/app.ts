import Fastify, { type FastifyError } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { requireAuth } from "./plugins/requireAuth.js";
import { requireReadKey } from "./plugins/requireReadKey.js";
import { requireInternalKey } from "./plugins/requireInternalKey.js";
import { productsRoutes } from "./routes/products.js";
import { redirectRoutes } from "./routes/redirect.js";
import { llmsRoutes } from "./routes/llms.js";
import { authRoutes } from "./routes/auth.js";
import { adminProductsRoutes } from "./routes/admin/products.js";
import { adminSlotsRoutes } from "./routes/admin/slots.js";
import { adminCheckRoutes } from "./routes/admin/check.js";
import { adminApiKeysRoutes } from "./routes/admin/apiKeys.js";
import { adminAccountRoutes } from "./routes/admin/account.js";
import { internalRoutes } from "./routes/internal.js";

// Separado de server.ts (que además hace `listen`) para que los scripts de
// Etapa 6 (export-openapi, export-postman) puedan construir la app y leer su
// spec sin levantar un puerto real.
export async function buildApp() {
  const app = Fastify({ logger: true });

  // Errores de validación de schema (límites de longitud, formatos, etc.) se
  // documentaron como 422 en 01-solucion-final.md §2.1 — Fastify por defecto
  // usa 400, así que se traduce acá.
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error.validation) {
      return reply.code(422).send({ error: "validation_error", details: error.validation });
    }
    app.log.error(error);
    return reply.code(error.statusCode ?? 500).send({ error: "internal_error" });
  });

  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Links Referidos API",
        description:
          "API para gestionar productos y links de afiliados (Amazon/Mercado Libre) consumidos por varias apps. Ver 01-solucion-final.md en el repo para el diseño completo.",
        version: "0.1.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            description:
              "Access token obtenido en POST /auth/register o /auth/login (email+contraseña). Vence a los 30 días — pensado para el dashboard, no para integraciones de larga vida. Usalo en /admin/*.",
          },
          readApiKey: {
            type: "http",
            scheme: "bearer",
            description:
              "Read API key generada desde el dashboard (POST /admin/api-keys, requiere sesión). No expira sola — pensada para que tu app la use indefinidamente en /v1/* sin volver a loguearse.",
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: "auth", description: "Registro e inicio de sesión (email+contraseña)." },
        { name: "productos", description: "Lectura de productos y sus slots (consumido por las apps)." },
        { name: "redirect", description: "Endpoint público que va en el botón de compra." },
        { name: "admin", description: "Alta/edición/baja de Products y Slots." },
      ],
    },
  });

  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/health", { schema: { hide: true } }, async () => ({ status: "ok" }));
  app.get("/openapi.json", { schema: { hide: true } }, async () => app.swagger());

  // /r/*, /llms.txt y /auth/* son públicos (auth/register-login son el
  // punto de entrada antes de tener ningún token — ver routes/auth.ts).
  await app.register(redirectRoutes);
  await app.register(llmsRoutes);
  await app.register(authRoutes);

  // /v1/* usa una read API key (ver plugins/requireReadKey.ts), no el JWT de
  // sesión — es lectura pensada para que una app consumidora la integre una
  // vez y siga funcionando indefinidamente, sin login humano de por medio.
  await app.register(
    async (v1) => {
      v1.addHook("onRequest", requireReadKey);
      await v1.register(productsRoutes);
    },
    { prefix: "/v1" },
  );

  // /admin/* requiere estar logueado: alta/edición/baja (Etapa 5), incluida
  // la generación/revocación de las read API keys de arriba.
  await app.register(
    async (admin) => {
      admin.addHook("onRequest", requireAuth);
      await admin.register(adminProductsRoutes);
      await admin.register(adminSlotsRoutes);
      await admin.register(adminCheckRoutes);
      await admin.register(adminApiKeysRoutes);
      await admin.register(adminAccountRoutes);
    },
    { prefix: "/admin" },
  );

  // /internal/* usa una credencial separada (INTERNAL_KEY, ver
  // plugins/requireInternalKey.ts): lo dispara el cron de GitHub Actions
  // (Etapa 7), no un usuario logueado.
  await app.register(
    async (internal) => {
      internal.addHook("onRequest", requireInternalKey);
      await internal.register(internalRoutes);
    },
    { prefix: "/internal" },
  );

  return app;
}
