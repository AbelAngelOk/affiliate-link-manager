import Fastify, { type FastifyError } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { requireApiKey } from "./plugins/requireApiKey.js";
import { productsRoutes } from "./routes/products.js";
import { redirectRoutes } from "./routes/redirect.js";
import { llmsRoutes } from "./routes/llms.js";
import { adminProductsRoutes } from "./routes/admin/products.js";
import { adminSlotsRoutes } from "./routes/admin/slots.js";
import { adminCheckRoutes } from "./routes/admin/check.js";
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
          apiKey: { type: "http", scheme: "bearer", description: "API key estática (v1, single-tenant)." },
        },
      },
      security: [{ apiKey: [] }],
      tags: [
        { name: "productos", description: "Lectura de productos y sus slots (consumido por las apps)." },
        { name: "redirect", description: "Endpoint público que va en el botón de compra." },
        { name: "admin", description: "Alta/edición/baja de Products y Slots." },
      ],
    },
  });

  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/health", { schema: { hide: true } }, async () => ({ status: "ok" }));
  app.get("/openapi.json", { schema: { hide: true } }, async () => app.swagger());

  // /r/* y /llms.txt son públicos.
  await app.register(redirectRoutes);
  await app.register(llmsRoutes);

  // /v1/* requiere API key: lectura para las apps consumidoras.
  await app.register(
    async (v1) => {
      v1.addHook("onRequest", requireApiKey);
      await v1.register(productsRoutes);
    },
    { prefix: "/v1" },
  );

  // /admin/* requiere API key: alta/edición/baja (Etapa 5).
  await app.register(
    async (admin) => {
      admin.addHook("onRequest", requireApiKey);
      await admin.register(adminProductsRoutes);
      await admin.register(adminSlotsRoutes);
      await admin.register(adminCheckRoutes);
    },
    { prefix: "/admin" },
  );

  // /internal/* requiere API key: lo dispara el cron (Etapa 7).
  await app.register(
    async (internal) => {
      internal.addHook("onRequest", requireApiKey);
      await internal.register(internalRoutes);
    },
    { prefix: "/internal" },
  );

  return app;
}
