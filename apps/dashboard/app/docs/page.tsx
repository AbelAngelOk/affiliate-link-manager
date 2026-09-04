import type { Metadata } from "next";
import { curlExample, groupByTag, listOperations, operationAnchor, sortTags, tagDescription, type OpenApiOperation } from "@/lib/openapi";
import { fetchOpenApiSpec } from "@/lib/openapiServer";
import { DocsSidebar } from "./DocsSidebar";
import { MethodBadge } from "./MethodBadge";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const SITE_URL = process.env.SITE_URL ?? "http://localhost:3001";

export const metadata: Metadata = {
  title: "Links Referidos API — Documentación",
  description:
    "Referencia de la API de gestión de productos y links de afiliados (Amazon/Mercado Libre): endpoints, autenticación y ejemplos curl.",
  alternates: { canonical: `${SITE_URL}/docs` },
};

// Página pública (ver middleware.ts) pensada para SEO/GEO/LLMO (ver
// 03-stack-tecnologico.md §3.4): cada endpoint es una sección autocontenida
// y citable, con un ejemplo curl concreto en vez de solo prosa. El layout
// (menú vertical con secciones desplegables + contenido) sigue el patrón
// habitual de referencias de API (Postman/Stripe-style): nav fija a la
// izquierda con anclas, contenido desplazable a la derecha, usando todo el
// ancho disponible en vez de quedar centrado en una columna angosta.
export default async function DocsPage() {
  const spec = await fetchOpenApiSpec();
  const operations = listOperations(spec);
  const grouped = groupByTag(operations);
  const tags = sortTags(Array.from(grouped.keys()));
  const operationsByTag = Object.fromEntries(grouped) as Record<string, OpenApiOperation[]>;
  const updated = new Date().toISOString().slice(0, 10);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: spec.info.title,
    description: spec.info.description,
    dateModified: updated,
  };

  return (
    <div className="w-full px-6 lg:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex flex-col gap-10 lg:flex-row">
        <DocsSidebar title={spec.info.title} version={spec.info.version} tags={tags} operationsByTag={operationsByTag} />

        {/* Contenido */}
        <main className="min-w-0 flex-1 py-8">
          <div className="max-w-5xl">
            <section id="introduccion" className="mb-10 scroll-mt-4">
              <h1 className="mb-2 text-3xl font-semibold">{spec.info.title}</h1>
              <p className="text-muted-foreground">{spec.info.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Versión {spec.info.version} — actualizado {updated}
              </p>
            </section>

            <section id="autenticacion" className="mb-10 scroll-mt-4">
              <h2 className="mb-2 text-xl font-semibold">Autenticación</h2>
              <p className="text-sm text-muted-foreground">
                Todas las rutas salvo{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  /r/{"{product_id}"}/{"{dominio}"}
                </code>{" "}
                requieren el header <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer &lt;API_KEY&gt;</code>. v1
                es single-tenant: una única API key por cuenta (ver el plan de migración a OAuth multi-tenant en el repo).
              </p>
            </section>

            <section id="recursos" className="mb-10 scroll-mt-4">
              <h2 className="mb-2 text-xl font-semibold">Recursos</h2>
              <ul className="space-y-1 text-sm">
                <li>
                  Especificación completa (OpenAPI 3.1):{" "}
                  <a className="text-primary hover:underline" href={`${API_BASE_URL}/openapi.json`}>
                    {API_BASE_URL}/openapi.json
                  </a>
                </li>
                <li>
                  Índice para agentes/LLM:{" "}
                  <a className="text-primary hover:underline" href={`${API_BASE_URL}/llms.txt`}>
                    {API_BASE_URL}/llms.txt
                  </a>
                </li>
                <li>
                  Documentación interactiva (Swagger UI):{" "}
                  <a className="text-primary hover:underline" href={`${API_BASE_URL}/docs`}>
                    {API_BASE_URL}/docs
                  </a>
                </li>
              </ul>
            </section>
          </div>

          <div className="max-w-6xl">
            {tags.map((tag) => (
              <section key={tag} id={tag} className="mb-12 scroll-mt-4">
                <h2 className="mb-1 text-xl font-semibold capitalize">{tag}</h2>
                {tagDescription(spec, tag) && <p className="mb-4 text-sm text-muted-foreground">{tagDescription(spec, tag)}</p>}

                <div className="grid gap-4 xl:grid-cols-2">
                  {grouped.get(tag)!.map((op: OpenApiOperation) => (
                    <article key={operationAnchor(op)} id={operationAnchor(op)} className="scroll-mt-4 rounded-lg border p-4">
                      <h3 className="mb-1 flex items-center gap-2 font-mono text-sm">
                        <MethodBadge method={op.method} />
                        {op.path}
                      </h3>
                      {op.summary && <p className="mb-3 text-sm text-muted-foreground">{op.summary}</p>}
                      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{curlExample(op, API_BASE_URL)}</pre>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
