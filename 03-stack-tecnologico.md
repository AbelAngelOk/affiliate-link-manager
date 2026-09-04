# Stack tecnológico propuesto

Contexto: proyecto personal, un solo desarrollador, múltiples apps cliente ya existentes (ej. `training-app`), tráfico bajo/medio, presupuesto acotado. **Decisiones ya tomadas:** Node.js, SQLite, arranque single-tenant (con el modelo preparado para migrar a multi-tenant más adelante, ver `01-solucion-final.md` §3). Se conserva el análisis que llevó a cada decisión como referencia, por si en algún momento hay que revisitarla.

## 3.1 Persistencia: SQLite (decisión tomada)

Tu precedente (la API que devuelve `.gif`s sin pasar por una DB externa) es un caso de **lectura pura de assets estáticos** — no hay estado mutable, no hay escrituras concurrentes. Este proyecto es distinto: tiene escrituras frecuentes desde dos fuentes a la vez (el panel de administración editando slots/links, y el job de verificación actualizando `status`/`last_checked_at` cada 12-24h).

- **SQLite embebido** corre como un archivo dentro del propio proceso/contenedor, sin ningún servicio externo que contratar ni administrar — sigue siendo una base de datos relacional real (transacciones ACID, índices), solo que el archivo lo operás vos en lugar de pagar un servicio administrado.
- **Limitación real a tener presente:** necesita disco persistente y, en general, un único proceso escritor. No funciona en plataformas serverless/edge sin estado (Vercel Functions, Cloudflare Workers "puros"); sí funciona bien en un contenedor long-running con volumen (Railway, Fly.io, Render).
- Para no perder datos si el contenedor se destruye: respaldo automático a un bucket con **Litestream** (replica el archivo SQLite a S3/R2 en continuo).
- Driver recomendado en Node: `better-sqlite3` (síncrono, rápido, sin overhead de promesas para queries simples).
- Alternativa descartada por ahora: Postgres administrado (Neon/Supabase) — daba mejores garantías de aislamiento multi-tenant "gratis" vía foreign keys, pero como el arranque es single-tenant esa ventaja no aplica todavía; se puede reconsiderar si el proyecto migra a multi-tenant con varios usuarios concurrentes.

## 3.2 Backend: Node.js (decisión tomada)

Se evaluó Go como alternativa por la posibilidad de un binario único sin dependencias externas (mismo espíritu que tu API de gifs). Conclusión del análisis: la diferencia de latencia entre Go y Node en el endpoint que importa (`GET /r/{slot_id}`, una lectura simple + 302) **no es perceptible** al volumen de este proyecto — está dominada por RTT de red, no por el lenguaje. La ventaja de Go quedaba en el verificador de disponibilidad (concurrencia más liviana con goroutines) y en el footprint del binario, pero no justificaba salir del stack habitual. Se eligió **Node.js + TypeScript + Fastify**:
- Fastify por ser liviano y tener soporte de primera clase para generar OpenAPI automáticamente desde los schemas de las rutas (clave para el punto de documentación, §3.4).
- El job de verificación (fan-out de checks a Amazon/ML) se resuelve con `Promise.allSettled` + un límite de concurrencia simple (ej. `p-limit`) — funcionalmente equivalente a lo que daría Go, con algo más de código.

## 3.3 Autenticación: API key estática para v1

Con el proyecto confirmado como single-tenant por ahora, no se implementa el flujo OAuth2 completo todavía — sería complejidad sin beneficio inmediato (ver `01-solucion-final.md` §3 para el detalle y el plan de migración). Para esta versión:
- Un único secreto (`API_KEY`) generado una vez, validado en un hook `onRequest` de Fastify contra el header `Authorization: Bearer <api_key>`.
- El modelo de datos ya incluye `owner_user_id` en `Product` apuntando a una única fila `User`, para que el día que haga falta multi-tenant real el cambio quede acotado a la capa de auth (reemplazar el hook por validación de JWT OAuth) sin tocar el esquema.

## 3.4 Documentación de la API (SEO + GEO + LLMO) y Postman

El uso principal declarado es **programático** — se gestiona desde Postman o directamente por un desarrollador (humano o agente de IA) integrándola en una app. Eso cambia la prioridad de la documentación: antes que "lectura humana en un navegador", lo que más rinde acá es que la especificación sea **correcta, completa y fácil de ingerir por una herramienta o un LLM**, y que además sea indexable/citable si en algún momento se busca que aparezca en resultados de búsqueda o de un motor generativo.

### Especificación técnica (base de todo lo demás)
- **OpenAPI 3.1 autogenerado** desde los schemas de Fastify (`@fastify/swagger`), publicado en una URL estable (`/openapi.json`). Es el artefacto más importante de los tres objetivos (SEO/GEO/LLMO): de ahí sale todo lo demás.
- **Colección de Postman generada automáticamente** a partir del OpenAPI (`openapi-to-postmanv2`), publicada como link "Run in Postman" en la página de docs. Se regenera en cada release, nunca se mantiene a mano — así nunca queda desactualizada respecto a la API real.
- `@fastify/swagger-ui` para tener una vista interactiva navegable "gratis" a partir del mismo spec (sirve como referencia rápida humana, aunque no sea el foco principal).

### LLMO (que un agente/LLM entienda y use bien la API)
- Publicar `/llms.txt` en la raíz del sitio de docs (convención emergente: un índice en Markdown plano con links a los recursos más importantes — el OpenAPI spec, la guía de inicio rápido, los ejemplos de curl) y opcionalmente `/llms-full.txt` con todo el contenido inline para que un agente lo traiga en una sola llamada.
- Cada endpoint documentado con **ejemplos concretos de request/response** (curl + JSON), no solo prosa — un LLM (o un desarrollador) integra mucho más rápido con un ejemplo copiable que con una descripción abstracta.
- Contenido de las páginas de docs como **HTML estático** (sin requerir ejecutar JS para ver el contenido) — cualquier fetch de un agente o crawler tiene que recibir el contenido completo en la respuesta inicial.

### GEO (que motores de búsqueda generativos citen bien esta API)
- Estructurar cada sección de la documentación como bloque autocontenido que responde una pregunta concreta ("¿Cómo filtro productos por app?", "¿Cómo redirijo al link vigente de un slot?") — el contenido "citable" en una sola porción rinde mejor en motores generativos que prosa larga que requiere leer toda la página.
- JSON-LD con `schema.org` (`TechArticle`/`SoftwareSourceCode`/`FAQPage` donde aplique).
- Fecha de "última actualización" visible por página — la frescura del contenido es señal tanto para SEO tradicional como para motores generativos.

### SEO tradicional (si en algún momento se quiere que el sitio sea indexable)
- Generación estática (SSG) para que cada página tenga contenido completo en el HTML servido, `sitemap.xml`, `robots.txt`, meta title/description por página.
- Nota realista: para una API interna de uso personal, el SEO tradicional es el objetivo de menor prioridad de los tres — se resuelve casi gratis al generar la doc con SSG, no requiere trabajo dedicado extra.

**Implementación concreta:** un único sitio Next.js (App Router, exportado estático) que sirve tanto las páginas de documentación (generadas a partir del OpenAPI spec + contenido Markdown propio) como el dashboard del punto siguiente — dos secciones de la misma app, no dos proyectos separados, para no multiplicar piezas a mantener.

## 3.5 Dashboard (CRUD)

Aunque el uso principal es programático, tiene sentido un frontend chico para dar de alta/editar Products y Slots (cada uno ya es un link + prioridad, ver `01-solucion-final.md` §2) sin tener que armar requests a mano en Postman para cada cambio:
- Mismo sitio Next.js del punto anterior, con rutas protegidas por la misma `API_KEY` (guardada en una cookie de sesión tras un login simple, no hace falta más para un solo usuario).
- **UI con shadcn/ui** (Tailwind CSS v4 + Radix UI): componentes copiados al repo (`components/ui/*`), no una dependencia de paquete — encaja con el resto del stack porque no agrega un runtime extra, solo código que ya queda en el proyecto y se puede editar directo.
- Productos y Slots se muestran como tableros (`@tanstack/react-table` para el ordenamiento de columnas), no como listas/tarjetas — cada fila es una entidad, cada columna un atributo, con una columna de acciones. Los slots de un producto se ven filtrados por ese producto en la página de detalle, y hay un tablero global en `/slots` con todos los slots de todos los productos (aclarando a cuál pertenece cada uno).
- "Apps" es una vista de solo lectura derivada de `products.apps[]` (no hay entidad App, ver `01-solucion-final.md` §2) — agrupa por nombre de app y muestra qué productos la usan.
- CRUD directo contra los endpoints de la API (no una capa de datos aparte) — el dashboard es un cliente más de la API, igual que cualquier app consumidora, solo que con permisos de escritura.
- No hace falta un framework de admin (Directus/PocketBase, etc.) — al ser CRUD sobre pocas entidades y un solo usuario, tableros + formularios con shadcn/ui alcanza y evita sumar una pieza más al stack.

**Tres entidades separadas para quien las usa, aunque compartan el mismo Next.js:** marketing (`/`, header oscuro con accesos a docs y al portal), documentación pública (`/docs`) y el portal de administración (todo lo protegido por `API_KEY`: `/productos`, `/apps`, `/slots`). Cada una vive bajo su propio layout — el layout raíz no impone ningún header compartido — y el login (`/login`) es una pantalla propia, sin nav, con el formulario centrado sobre fondo blanco a modo de modal. El portal usa un menú vertical oscuro fijo (Productos / Apps / Slots) en vez del header horizontal de la versión anterior, con un acceso a la documentación que abre en una pestaña nueva.

## 3.6 Organización del repositorio: API y front en el mismo proyecto (monorepo)

La API (Fastify) y el front (Next.js — docs + dashboard) son **procesos/deployables distintos** — el front nunca debe tocar SQLite directo, tiene que consumir la API igual que cualquier app cliente externa (así se garantiza que la API por sí sola alcanza para todo, sin atajos ocultos para el dashboard). Eso es independiente de si viven en el mismo repositorio o no.

- **Recomendación: mismo repositorio, como monorepo** (workspaces de npm/pnpm), con `apps/api` y `apps/dashboard` como paquetes separados dentro de un único repo — no dos repositorios independientes.
- Motivo concreto: el front puede generar su cliente TypeScript directo desde el `openapi.json` que expone la API (§3.4) e importarlo dentro del mismo repo sin publicar un paquete a npm. Cuando se cambia un endpoint y su consumidor en el dashboard al mismo tiempo, queda en un solo commit — con un solo desarrollador y dos repos separados, es fácil que quede la API actualizada y el front desactualizado (o viceversa) sin que nada lo marque.
- Repos separados solo tendría sentido si en algún momento se quiere dar acceso al código de uno de los dos a otra persona con permisos distintos, o publicar la API como proyecto independiente de terceros — ninguno de los dos casos aplica hoy.
- El deploy sigue siendo independiente por paquete (la API a Fly.io/Railway, el front a Vercel), el monorepo es solo una decisión de organización de código fuente, no ata el despliegue de uno al del otro.

## 3.7 Resto del stack

- **Job programado:** GitHub Actions con cron, pegándole a un endpoint interno protegido con la misma API key.
- **Notificaciones:** bot de Telegram (setup mínimo, gratis, inmediato).
- **Hosting API:** Fly.io o Railway (soportan volumen persistente para SQLite).
- **Hosting docs+dashboard (Next.js):** Vercel o el mismo Fly.io/Railway — si se prioriza SEO/GEO, Vercel tiene mejor soporte de SSG/ISR out of the box.

## 3.8 Qué evitar

- Microservicios separados por proveedor (Amazon/ML) — un único servicio con dos "estrategias" de verificación alcanza.
- Colas de mensajes (Kafka/RabbitMQ/SQS) — el volumen no las justifica; un cron simple es suficiente.
- Kubernetes o cualquier orquestador — innecesario a esta escala.
- Multi-región / réplicas de base de datos — sin sentido para el volumen de tráfico descrito.
- Implementar el flujo OAuth2 completo ahora — es trabajo real (emisión/rotación de tokens, alta de clientes) para un beneficio que no existe todavía con un solo usuario; queda documentado como paso futuro, no como tarea de esta versión.
- Un framework de admin de terceros (Directus/PocketBase/Retool) para el dashboard — con 4-5 entidades y un usuario, agrega más superficie de la que ahorra.
