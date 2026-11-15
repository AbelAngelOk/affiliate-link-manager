# links-referidos-api — contexto del proyecto

Servicio que guarda productos y sus links de afiliado (Amazon / Mercado Libre) y los sirve a las apps del usuario sin hardcodear URLs que se rompen. Hoy corre en Fly.io con SQLite. Monorepo (`apps/`): `api` (Fastify + Drizzle), `dashboard` (Next.js) y `mcp` (administra el servicio desde Claude Code).

Consumidores: `menu` (`menu-app`), `switch` (`despertador-app`) y pronto `respira` (`respira-app`). Los botones de compra de las apps abren `https://links-referidos-api.fly.dev/r/{producto}/{dominio}`: **ese redirect está en uso, no se rompe ni se mueve sin migrar a las apps**.

## Leer según la tarea
- Qué es y cómo funciona: `01-solucion-final.md` (modelo, endpoints), `02-gestion-links-afiliados.md`.
- Decisiones de stack: `03-stack-tecnologico.md`, `07-fly-io-vs-turso.md`, `08-por-que-fly-io-y-no-supabase.md`.
- Alcance y límites conocidos: `04-alcance-y-limitaciones.md`. Plan por etapas y pendientes resueltos: `05-plan-de-desarrollo.md`.
- Cómo se verifica que un link sigue vivo: `06-verificacion-de-disponibilidad.md`.
- **Propuesta vigente, NO iniciada y sin prioridad**: `09-migracion-a-base-compartida.md` (pasar los datos y la lectura a la base Supabase compartida; plan de sesiones L0–L6, riesgos y decisiones). No empezarla sin que el usuario lo pida.

## Comandos
```
npm run dev:api                          # API en local (SQLite)
npm run build:mcp                        # compila el MCP
npm run db:generate --workspace=apps/api  # migraciones de Drizzle (también db:migrate, db:seed)
npm run docs:openapi --workspace=apps/api # exporta OpenAPI (también docs:postman)
```

## Reglas
- Antes de tocar el dashboard en producción, el proyecto de Fly o la base de Supabase: confirmar con el usuario (son servicios remotos).
- Si se toca la base compartida (`../base-compartida`): usar su MCP `base-compartida` y respetar `BASE_COMPARTIDA.md`; nunca `supabase db push`, `db reset --linked` ni `config push`.
- Los límites de longitud de los campos de producto se validan al escribir, no al leer (`01-solucion-final.md` §2.1).
- Textos y documentación en español.
