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
/r/{slot_id} es público (sin auth) — es el link que va en el botón de compra.

## Endpoints principales

### Consumo desde una app
GET /v1/products?app_id={app_id}
  Productos asociados a esa app, con sus slots activos y su cta_url.
  curl -H "Authorization: Bearer $API_KEY" "$BASE/v1/products?app_id=$APP_ID"

GET /v1/products/{id}/slots?provider=amazon&country=mx
  Slots de un producto puntual, filtrados por proveedor/país.
  curl -H "Authorization: Bearer $API_KEY" "$BASE/v1/products/$ID/slots?provider=amazon"

### El botón de compra
GET /r/{slot_id}
  302 al link de afiliado vigente, o 410 si el slot no tiene ningún link activo.

### Administración (alta/edición/baja)
POST /admin/products        - crear producto (limites de longitud: ver /openapi.json)
POST /admin/products/{id}/slots  - crear slot (provider + country)
POST /admin/slots/{id}/links     - agregar un link candidato a un slot

## Modelo de datos
Product -> Slot (proveedor + país) -> SlotLink (cola de links candidatos, con
fallback automático al siguiente si el vigente se rompe). Detalle completo en
01-solucion-final.md del repositorio.
`;

export async function llmsRoutes(fastify: FastifyInstance) {
  fastify.get("/llms.txt", { schema: { hide: true } }, async (_request, reply) => {
    reply.type("text/plain; charset=utf-8").send(LLMS_TXT);
  });
}
