import "server-only";
import type { OpenApiSpec } from "./openapi";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

// Público, sin cookie: es la misma spec que sirve /openapi.json en la API
// (ver 03-stack-tecnologico.md §3.4) — nunca se escribe a mano acá, siempre
// se lee de la fuente autogenerada por Fastify. Server-only porque hace un
// fetch de red — separado de lib/openapi.ts para que las funciones de
// formateo (que sí necesita el sidebar del lado del cliente) no arrastren
// esta restricción.
export async function fetchOpenApiSpec(): Promise<OpenApiSpec> {
  const res = await fetch(`${API_BASE_URL}/openapi.json`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`No se pudo leer /openapi.json (${res.status})`);
  return res.json();
}
