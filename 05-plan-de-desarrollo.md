# Plan de desarrollo por etapas

Basado en las decisiones ya tomadas en `01-solucion-final.md`, `02-gestion-links-afiliados.md`, `03-stack-tecnologico.md` y `04-alcance-y-limitaciones.md`: Node.js + Fastify (API), SQLite embebido, single-tenant con API key, monorepo (`apps/api` + `apps/dashboard`).

Cada etapa es chica, verificable y deja el proyecto en un estado funcional — no se pasa a la siguiente hasta poder probar la anterior. El orden prioriza llegar cuanto antes al punto donde el sistema **ya resuelve el problema original** (un link que se cae no rompe la app), y deja lo accesorio (docs públicas, dashboard, checker automático) para después.

## Estado actual

| Etapa | Estado |
|---|---|
| 0 — Bootstrap | ✅ Hecho y verificado |
| 1 — Modelo de datos | ✅ Hecho y verificado |
| 2 — Auth por API key | ✅ Hecho y verificado |
| 3 — Endpoints de lectura | ✅ Hecho y verificado |
| 4 — Endpoint de redirección | ✅ Hecho y verificado |
| 5 — CRUD de administración | ✅ Hecho y verificado |
| 6 — OpenAPI/Postman/llms.txt | ✅ Hecho y verificado |
| 7 — Verificador de disponibilidad | ✅ Hecho y verificado |
| 8 — Notificaciones (Telegram) | ✅ Hecho y verificado (sin bot real todavía: cae a log en consola) |
| 9 — Dashboard (Next.js) | ✅ Hecho y verificado |
| 10 — Sitio de docs (SEO/GEO) | ✅ Hecho y verificado |
| 11 — Deploy y operación | ✅ Hecho y verificado — API en Fly.io, dashboard en Vercel, cron corriendo en producción |
| 12 — OAuth2 multi-tenant | ✅ Hecho y verificado (adelantada, ver nota abajo) |

**Nota sobre Etapa 11:** deployado y verificado en producción — API en `https://links-referidos-api.fly.dev` (Fly.io, volumen persistente para SQLite, migraciones en el arranque del propio proceso), dashboard en Vercel, y el cron de GitHub Actions corriendo contra producción con una ejecución manual exitosa. Pendiente todavía: Litestream (backup continuo de la SQLite) y el bot de Telegram real — ambos requieren cuentas propias del usuario.

**Nota sobre Etapa 12:** no estaba planeada para esta versión (`01-solucion-final.md` §3 la documentaba como "cuando escale"), se adelantó a pedido explícito una vez que el sistema ya estaba en producción, sin que exista todavía una segunda cuenta real. Primer intento: OAuth2 Client Credentials (`client_id`/`client_secret` por tenant) — se descartó antes de deployar porque no resolvía el caso real pedido (una persona iniciando sesión en el dashboard). Diseño final, más simple: cuentas con email+contraseña (hash scrypt, `auth/password.ts`), un único `POST /auth/register`/`POST /auth/login` que devuelve un JWT (`auth/jwt.ts`) usado tanto por el dashboard (guardado en cookie httpOnly) como por cualquier consumidor directo de la API — mismo login para las dos formas de usar el sistema. `/internal/check` quedó con su propia credencial separada (`INTERNAL_KEY`, `plugins/requireInternalKey.ts`), sin depender de ningún login de usuario. Verificado en vivo: aislamiento de datos entre cuentas, rechazo de contraseña incorrecta, email duplicado, y que un JWT de usuario no sirve contra `/internal/check`. Detalle completo en `01-solucion-final.md` §3 y limitaciones conocidas en `04-alcance-y-limitaciones.md`.

## Etapa 0 — Bootstrap del repo
- Monorepo con npm workspaces (se usó npm en vez de pnpm — no estaba instalado y npm 10 ya lo soporta nativo): `apps/api`, `apps/dashboard` (este último recién se llena de contenido en Etapa 9).
- TypeScript, ESLint/Prettier, `.gitignore`, `.env.example`.
- `apps/api`: Fastify mínimo con un endpoint `GET /health`.
- **Listo cuando:** `npm run dev:api` levanta la API y `GET /health` responde 200.

## Etapa 1 — Modelo de datos y persistencia
- SQLite vía `better-sqlite3`, con `drizzle-orm` como capa tipada (migraciones + queries), dado que no estaba fijado el ORM en el doc de stack — es la elección natural para no escribir SQL a mano en ~6 tablas y mantener migraciones versionadas.
- Tablas según `01-solucion-final.md` §2: `User` (una sola fila seed), `Product` (con los límites de longitud de §2.1 como constraints/validación, y `apps` como array — no hay entidad `App` separada), `Slot` (un único link + prioridad + dominio, sin tabla separada de "links"), `CheckLog`.
- Script de seed para datos de prueba en local.
- **Listo cuando:** las migraciones corren limpio sobre un archivo `.db` nuevo, y un script de seed carga un producto de ejemplo con slots y links.

## Etapa 2 — Autenticación por API key
- Hook `onRequest` en Fastify que valida `Authorization: Bearer <API_KEY>` contra la variable de entorno.
- Aplica a todas las rutas `/v1/*` y `/admin/*`. **`/r/{product_id}/{dominio}` queda público** — es el link que va en el botón de la app, no puede requerir credenciales.
- **Listo cuando:** un request sin key a `/v1/*` devuelve 401, y con key válida pasa.

## Etapa 3 — Endpoints de lectura (consumo desde las apps)
- `GET /v1/products?app=` (con `include_unavailable` opcional).
- `GET /v1/products/{id}/slots?dominio=`.
- **Listo cuando:** con los datos de seed de Etapa 1, ambos endpoints devuelven el shape exacto definido en `01-solucion-final.md` §4.

## Etapa 4 — Endpoint de redirección (el corazón del proyecto)
- `GET /r/{product_id}/{dominio}` → 302 al `Slot` activo de mayor prioridad para ese dominio, `410 Gone` si no hay ninguno.
- **Este es el corte mínimo que ya resuelve el problema original.** Con las Etapas 1-4 completas, se puede pegar `https://tu-api/r/{product_id}/{dominio}` como `href` en un botón real de `training-app` (o la que sea) y probar el flujo de punta a punta, aunque todo lo demás (checker, dashboard, docs públicas) todavía no exista.
- **Listo cuando:** el link de un slot cargado a mano en Etapa 1 redirige correctamente desde un botón real de alguna app existente.

## Etapa 5 — Endpoints de escritura / administración
- CRUD (`POST`/`PATCH`/`DELETE`) para `Product` (incluye editar su array `apps`) y `Slot` (cada uno ya es un link + prioridad para un dominio).
- Validación de los límites de caracteres de `01-solucion-final.md` §2.1 en la escritura (422 si se excede), texto plano forzado (rechazar HTML/Markdown).
- **Listo cuando:** se puede dar de alta un producto completo (con sus slots y links) vía requests a la API, sin tocar la base de datos a mano.

## Etapa 6 — Documentación de la API (OpenAPI, Postman, llms.txt)
- `@fastify/swagger` generando el spec desde los schemas ya definidos en las Etapas 3 y 5 (no se escribe a mano, sale de las rutas existentes).
- `/openapi.json` público, `@fastify/swagger-ui` en `/docs`.
- Script que genera la colección de Postman a partir del spec (`openapi-to-postmanv2`) y la publica.
- `/llms.txt` con índice de recursos clave (spec, guía rápida, ejemplos curl por endpoint).
- **Listo cuando:** se puede importar la colección a Postman y hacer todos los requests documentados sin mirar el código.

## Etapa 7 — Verificador de disponibilidad
- Endpoint interno protegido (ej. `POST /internal/check`) que dispara el job.
- **Mercado Libre:** `GET api.mercadolibre.com/items/{id}` por cada `Slot` activo, actualiza `status` según la respuesta.
- **Amazon:** chequeo débil (HTTP status del link) marcado explícitamente como señal de alerta, no de verdad — ver limitación de acceso a la Creators API en `04-alcance-y-limitaciones.md`.
- Umbral de fallos consecutivos antes de marcar `broken` (evita falsos positivos por caídas puntuales).
- Al fallar un `Slot`, el próximo activo del mismo dominio ya responde solo (no hace falta "promover" nada); si no queda ninguno, ese dominio pasa a no disponible (agregado, se calcula al leer, no se guarda).
- GitHub Actions con cron pegándole a `/internal/check` cada 12-24h.
- **Listo cuando:** romper a propósito un link de prueba en Etapa 1 hace que, tras correr el check, el slot pase al siguiente candidato (o a `unavailable` si no hay más).

## Etapa 8 — Notificaciones
- Bot de Telegram, mensaje cuando un `Slot` pasa a `unavailable`.
- **Listo cuando:** el escenario de prueba de Etapa 7 dispara un mensaje real al bot.

## Etapa 9 — Dashboard (Next.js + shadcn/ui)
- Login simple (API key → cookie de sesión httpOnly, `apiFetch` server-only contra la API) — pantalla propia sin nav, formulario centrado sobre fondo blanco a modo de modal.
- UI con **shadcn/ui** (Tailwind v4 + Radix UI) y tableros ordenables con `@tanstack/react-table`: Productos es un tablero (fila = producto, columna = atributo, con columna de acciones editar/borrar/ver detalle); dentro del detalle de un producto, sus Slots son otro tablero filtrado por ese producto, más un tablero global en `/slots` con todos los slots de todos los productos aclarando a cuál pertenece cada uno.
- `/apps` es una vista de solo lectura derivada de `products.apps[]` (no hay entidad App, ver `01-solucion-final.md` §2), agrupando por nombre de app.
- CRUD sobre las mismas entidades de Etapa 5 (sin `App`: los nombres de apps se editan como parte del producto).
- El portal (`/productos`, `/apps`, `/slots`) usa un menú vertical oscuro fijo, con acceso a `/docs` en pestaña nueva y logout — separado del header de marketing (`/`) y del menú propio de `/docs`, para que cada área se lea como una entidad distinta aunque compartan el mismo Next.js.
- **Listo cuando:** se puede dar de alta un producto completo desde el dashboard sin usar Postman, y las tablas de productos/slots se pueden ordenar por columna.

## Etapa 10 — Sitio de documentación (SEO/GEO) dentro del mismo Next.js
- Páginas estáticas (SSG) generadas a partir del OpenAPI spec + contenido propio en Markdown.
- JSON-LD `schema.org`, `sitemap.xml`, `robots.txt`, meta tags por página.
- Botón "Run in Postman", link a `/llms.txt`.
- **Listo cuando:** el sitio está desplegado y cada endpoint documentado tiene su propia página indexable.

## Etapa 11 — Deploy y operación
- API a Fly.io/Railway con volumen persistente para SQLite + Litestream apuntando a un bucket.
- Dashboard/docs (Next.js) a Vercel.
- Cron de GitHub Actions apuntando a producción.
- Monitoreo básico de uptime sobre `/r/{product_id}/{dominio}` (single point of failure documentado en `04-alcance-y-limitaciones.md`).
- **Listo cuando:** el flujo completo (botón real en una app → redirect → checker → dashboard) corre en producción, no solo en local.

## Fuera de este plan (a futuro, no ahora)
- Overrides de texto por app y marketplaces adicionales — ver `04-alcance-y-limitaciones.md` §4.2.

## Pendientes anotados (2026-09-05, a resolver en otro momento)

- ~~**Cambiar contraseña.**~~ **Resuelto el 2026-09-06.** `PATCH /admin/password` (requiere sesión + contraseña actual), pantalla nueva en el dashboard (`/cuenta`, menú "Mi cuenta"). Verificado en vivo: rechaza contraseña actual incorrecta, y tras el cambio el login viejo deja de funcionar y el nuevo sí. **Sigue pendiente "olvidé mi contraseña"** (recuperación sin tener la contraseña vieja) — requiere elegir un proveedor de envío de email, no resuelto todavía.
- ~~**Bug: `POST /apps` devuelve 500 en producción.**~~ **Sin repro (2026-09-06).** Probado directo contra la API en producción con la cuenta real (incluyendo un chequeo real con slots de Mercado Libre existentes) y cargando `/apps` logueado en el dashboard — todo responde 200. No se encontró nada roto revisando `validateApp`/`apiFetch`/`POST /admin/apps/{nombre}/check`. Más probable: efecto transitorio de los redeploys seguidos de API y dashboard ese día (pudieron quedar en estados de auth distintos por unos segundos). Reabrir si vuelve a pasar, con el mensaje de error completo de la pestaña Network.
- **Nuevas garantías de calidad para imágenes de producto.** Definir tamaño y proporción (aspect ratio) esperados para `imagen_url`, ver cómo se valida (¿solo documentado, o rechazo real en el alta/edición?) — hoy no hay ninguna validación más allá de que sea una URL.
- **Entidad "tipo de producto" (campos dinámicos por tipo).** Hoy `Product` tiene un set fijo de campos para todos los productos (`01-solucion-final.md` §2). La idea: poder definir un "tipo de producto" (ej. "libro") con su propio conjunto de campos (ej. título, descripción, autor, nota del dueño del sitio), y que cada producto de ese tipo tenga esos campos específicos además de (¿o en vez de?) los genéricos actuales. Esto es un cambio de modelo de datos no trivial — falta definir si los campos por tipo son fijos por tipo (schema propio por tipo) o un sistema más genérico de campos dinámicos (ej. JSON schema por tipo, o tabla de definición de campos + tabla de valores). Diseñar antes de implementar.
- ~~**El GET de las apps consumidoras no puede depender de un token que expira.**~~ **Resuelto el 2026-09-06.** `/v1/*` pasó a usar una read API key propia (`plugins/requireReadKey.ts`), sin expiración salvo revocación manual, generada desde el dashboard (`/api-keys`, `POST /admin/api-keys` — requiere sesión) — separada del JWT de sesión, que quedó acotado a `/admin/*`. Detalle completo en `01-solucion-final.md` §3. Verificado en vivo: la read key funciona en `/v1/*` y no en `/admin/*`; el JWT de sesión ya no funciona en `/v1/*`; revocar la key la invalida en el acto.
