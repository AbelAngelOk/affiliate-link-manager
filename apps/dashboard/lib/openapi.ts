// Sin "server-only": estas son funciones puras de formateo, las usa tanto
// app/docs/page.tsx (Server Component) como app/docs/DocsSidebar.tsx (Client
// Component, necesita estado para expandir/colapsar secciones). El fetch
// real del spec vive aparte en lib/openapiServer.ts, ese sí server-only.

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
  tags?: Array<{ name: string; description?: string }>;
};

// Orden de lectura preferido para el menú (ver app.ts): lo que un integrador
// usa primero (leer productos, redirigir) antes que la parte de gestión.
const TAG_ORDER = ["productos", "redirect", "admin"];

export function sortTags(tagNames: string[]): string[] {
  return [...tagNames].sort((a, b) => {
    const ia = TAG_ORDER.indexOf(a);
    const ib = TAG_ORDER.indexOf(b);
    return (ia === -1 ? TAG_ORDER.length : ia) - (ib === -1 ? TAG_ORDER.length : ib);
  });
}

export function tagDescription(spec: OpenApiSpec, tag: string): string | undefined {
  return spec.tags?.find((t) => t.name === tag)?.description;
}

// Los path params ("{id}") y las barras no son seguros como fragmento de URL
// sin escapar — se limpian acá para que el ancla del menú y el id de la
// sección siempre coincidan con algo navegable.
export function operationAnchor(op: Pick<OpenApiOperation, "method" | "path">): string {
  const cleanPath = op.path.replace(/[{}]/g, "").replace(/\//g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${op.method.toLowerCase()}-${cleanPath}`;
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
