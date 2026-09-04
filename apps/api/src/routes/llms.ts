import type { FastifyInstance } from "fastify";

// Convención emergente (ver 03-stack-tecnologico.md §3.4): índice en texto
// plano para que un agente/LLM entienda rápido qué hace esta API sin tener
// que parsear el spec completo primero. Placeholder hasta que el sitio de
// docs (Etapa 10) tenga contenido más largo en /llms-full.txt.
const LLMS_TXT = `# Links Referidos API

API que gestiona productos y sus links de afiliados (Amazon / Mercado Libre)
para que varias apps los consuman sin hardcodear URLs que se rompen cuando
un producto deja de estar disponible.

## Recursos clave
- Especificación completa (OpenAPI 3.1): /openapi.json
- Documentación interactiva (Swagger UI): /docs

## Autenticación
Header \`Authorization: Bearer <API_KEY>\` en todas las rutas /v1/* y /admin/*.
/r/{product_id}/{dominio} es público (sin auth) — es el link que va en el botón de compra.

## Endpoints principales

### Consumo desde una app
GET /v1/products?app={nombre}
  Productos asociados a esa app (por nombre, no hay entidad App propia — ver
  01-solucion-final.md §2), con sus dominios activos y su cta_url.
  curl -H "Authorization: Bearer $API_KEY" "$BASE/v1/products?app=despertador-app"

GET /v1/products/{id}/slots?dominio=amazon.com.mx
  Dominios de un producto puntual (ej. amazon.com.mx, mercadolibre.com.ar).
  curl -H "Authorization: Bearer $API_KEY" "$BASE/v1/products/$ID/slots?dominio=amazon.com.mx"

### El botón de compra
GET /r/{product_id}/{dominio}
  302 al link de afiliado vigente para ese dominio, o 410 si no queda ninguno activo.

### Administración (alta/edición/baja)
POST /admin/products             - crear producto (limites de longitud: ver /openapi.json)
POST /admin/products/{id}/slots  - crear slot (dominio + affiliate_url + priority opcional)

## Modelo de datos
Product -> Slot (un único link + prioridad, agrupado por "dominio" — ej.
amazon.com.mx, mercadolibre.com.ar). Varios slots pueden compartir el mismo
producto+dominio: forman la cola de fallback de ese canal, ordenada por
priority; si el de mayor prioridad se rompe, el próximo toma su lugar
automáticamente. Detalle completo en 01-solucion-final.md del repositorio.
`;

export async function llmsRoutes(fastify: FastifyInstance) {
  fastify.get("/llms.txt", { schema: { hide: true } }, async (_request, reply) => {
    reply.type("text/plain; charset=utf-8").send(LLMS_TXT);
  });
}
