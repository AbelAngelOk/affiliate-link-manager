import type { Metadata } from "next";
import { curlExample, fetchOpenApiSpec, groupByTag, listOperations } from "@/lib/openapi";

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
// y citable, con un ejemplo curl concreto en vez de solo prosa.
export default async function DocsPage() {
  const spec = await fetchOpenApiSpec();
  const operations = listOperations(spec);
  const grouped = groupByTag(operations);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: spec.info.title,
    description: spec.info.description,
    dateModified: new Date().toISOString().slice(0, 10),
  };

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <h1>{spec.info.title}</h1>
      <p>{spec.info.description}</p>
      <p style={{ color: "#666", fontSize: "0.9em" }}>Versión {spec.info.version} — actualizado {jsonLd.dateModified}</p>

      <ul>
        <li>
          Especificación completa (OpenAPI 3.1): <a href={`${API_BASE_URL}/openapi.json`}>{API_BASE_URL}/openapi.json</a>
        </li>
        <li>
          Índice para agentes/LLM: <a href={`${API_BASE_URL}/llms.txt`}>{API_BASE_URL}/llms.txt</a>
        </li>
        <li>
          Documentación interactiva (Swagger UI): <a href={`${API_BASE_URL}/docs`}>{API_BASE_URL}/docs</a>
        </li>
      </ul>

      <h2 id="autenticacion">Autenticación</h2>
      <p>
        Todas las rutas salvo <code>/r/{"{slot_id}"}</code> requieren el header{" "}
        <code>Authorization: Bearer &lt;API_KEY&gt;</code>. v1 es single-tenant: una única API key por cuenta (ver el
        plan de migración a OAuth multi-tenant en el repo).
      </p>

      {Array.from(grouped.entries()).map(([tag, ops]) => (
        <section key={tag} id={tag}>
          <h2>{tag}</h2>
          {ops.map((op) => (
            <article key={`${op.method}-${op.path}`} id={`${op.method.toLowerCase()}-${op.path}`} style={{ marginBottom: 20 }}>
              <h3>
                <code>
                  {op.method} {op.path}
                </code>
              </h3>
              {op.summary && <p>{op.summary}</p>}
              <pre style={{ background: "#f4f4f4", padding: 12, borderRadius: 6, overflowX: "auto" }}>
                {curlExample(op, API_BASE_URL)}
              </pre>
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}
