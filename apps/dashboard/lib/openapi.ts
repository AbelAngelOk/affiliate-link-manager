import "server-only";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

export type OpenApiOperation = {
  method: string;
  path: string;
  summary?: string;
  tags?: string[];
  requiresAuth: boolean;
};

export type OpenApiSpec = {
  info: { title: string; description?: string; version: string };
  paths: Record<string, Record<string, { summary?: string; tags?: string[] }>>;
};

// Público, sin cookie: es la misma spec que sirve /openapi.json en la API
// (ver 03-stack-tecnologico.md §3.4) — nunca se escribe a mano acá, siempre
// se lee de la fuente autogenerada por Fastify.
export async function fetchOpenApiSpec(): Promise<OpenApiSpec> {
  const res = await fetch(`${API_BASE_URL}/openapi.json`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`No se pudo leer /openapi.json (${res.status})`);
  return res.json();
}

export function listOperations(spec: OpenApiSpec): OpenApiOperation[] {
  const ops: OpenApiOperation[] = [];
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, def] of Object.entries(methods)) {
      ops.push({
        method: method.toUpperCase(),
        path,
        summary: def.summary,
        tags: def.tags,
        requiresAuth: !path.startsWith("/r/"),
      });
    }
  }
  return ops;
}

export function groupByTag(ops: OpenApiOperation[]): Map<string, OpenApiOperation[]> {
  const groups = new Map<string, OpenApiOperation[]>();
  for (const op of ops) {
    const tag = op.tags?.[0] ?? "otros";
    const arr = groups.get(tag) ?? [];
    arr.push(op);
    groups.set(tag, arr);
  }
  return groups;
}

export function curlExample(op: OpenApiOperation, publicBaseUrl: string): string {
  const authHeader = op.requiresAuth ? ` \\\n  -H "Authorization: Bearer $API_KEY"` : "";
  const method = op.method === "GET" ? "" : ` -X ${op.method}`;
  return `curl${method}${authHeader} \\\n  "${publicBaseUrl}${op.path}"`;
}
