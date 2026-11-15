# Migración a la base Supabase compartida (propuesta)

> **Estado: propuesta aprobada en principio, NO iniciada y sin prioridad** (2026-11-05). No se implementa hasta que el usuario abra una sesión para este proyecto.
> Reevalúa la decisión de `08-por-que-fly-io-y-no-supabase.md` y `07-fly-io-vs-turso.md`. Contexto de la plataforma: repo `../base-compartida` (`BASE_COMPARTIDA.md`, `docs/ARQUITECTURA.md`, `docs/AUTH.md`).

## 1. Resumen

El usuario tiene una base Supabase compartida entre sus proyectos (ref `erfmmwxitjkvrebozyqb`, plan **Free**) con un solo login (`auth.users`) y un schema por proyecto. La propuesta: que los **datos** de este servicio vivan ahí (schema `links_referidos`) y que las apps los **lean directamente** de la base, en vez de pasar por una API propia con una API key.

Importante: **el proyecto sigue siendo necesario**. Lo que cambia es que deja de ser "un servidor con su base" y pasa a ser **un dashboard + un verificador + un redirect** sobre tablas de la base compartida.

| Componente | Hoy | Propuesta | Se mantiene |
|---|---|---|---|
| Datos | SQLite en un volumen de Fly (`/data/prod.db`) | Postgres, schema `links_referidos` | Sí, en otro lado |
| Lectura desde las apps (`GET /v1/products?app=`) | API en Fly + read API key dentro del build de cada app | Función pública `links_referidos.catalogo(app)` de la base; sin key | La lectura sí; la API y la key no |
| Redirect de los botones (`GET /r/{producto}/{dominio}`) | Ruta de la API en Fly | Edge Function `links_referidos-r` | **Sí (hoy lo usan los botones de las apps)** |
| Verificador de links | GitHub Actions cada 12 h → `POST /internal/check` en Fly | `pg_cron` → Edge Function `links_referidos-check` | Sí |
| Dashboard (Next.js) | Login propio (scrypt + JWT + Resend) | Mismo dashboard con `supabase-js` y el **login único** | Sí, simplificado |
| MCP del proyecto (`apps/mcp`) | Envuelve `/admin/*` de la API en Fly | Misma herramienta, contra Supabase | Sí, cambia contra qué habla |
| Avisos por Telegram | Desde la API | Desde la Edge Function del verificador | Sí |

## 2. Qué cambió desde el documento 08

El 08 eligió Fly + SQLite y dejó criterios para reconsiderar. Estado de cada uno:

| Criterio del 08 | Hoy |
|---|---|
| "Si migra a multi-tenant con varios usuarios concurrentes" | El proyecto ya es multi-tenant (cuentas, `owner_user_id`), aunque con un solo usuario real |
| "Se quiere aislamiento garantizado por la base (RLS) en vez de por código" | Es lo que da la base compartida: RLS con membresía por proyecto |
| "El costo de backups/operación propia deja de compensar" | Los backups con Litestream **siguen pendientes**: hoy perder el volumen de Fly es perder la base |
| Razón n.° 2 de Fly: "el plan Free de Supabase se pausa tras una semana sin actividad y el redirect tiene que responder siempre" | **Sigue vigente**: la base compartida es Free (§7). Es el principal riesgo de esta propuesta |
| Razón n.° 1: "dos servicios con sus credenciales" | La base compartida ya existe y está pagada en esfuerzo por otros proyectos |

## 3. Situación actual (verificada el 2026-11-05)

- **Consumidores de la API**, todos con `GET https://links-referidos-api.fly.dev/v1/products?app=<APP_NAME>` y una read key en `EXPO_PUBLIC_LINKS_API_KEY`:

  | App (repo) | `APP_NAME` | Estado |
  |---|---|---|
  | `menu` (Mesa Puesta) | `menu-app` | Integrada; el espacio todavía no existe en el dashboard (Libros muestra el estado vacío) |
  | `switch` (nace de Despertador Alba) | `despertador-app` | Integrada |
  | `respira` | `respira-app` (a crear) | Planificada (`respira/docs/12-recursos-libros.md`) |

- **Los botones de compra abren la URL del redirect de Fly**: cada slot que devuelve la API trae un `cta_url` relativo (`/r/{producto}/{dominio}`) y las apps lo resuelven contra `API_BASE_URL` (`resolveStoreUrl` en `src/features/recursos/api.ts`). Por eso el redirect **no es opcional**.
- **El redirect es chico**: una consulta (el slot `active` de menor `priority` de ese producto+dominio) y un `302` al link de afiliado, o `410 Gone` si no hay ninguno. **No registra clics** (el doc 04 lo menciona solo como idea futura).
- **Verificador**: `.github/workflows/checker-cron.yml` cada 12 h llama a `POST /internal/check` con `INTERNAL_KEY`. Un slot pasa a `broken` tras 2 fallos seguidos (`06-verificacion-de-disponibilidad.md`). Avisa por Telegram.
- **Login propio**: tabla `users` (contraseña con `scrypt`), JWT, `/auth/forgot-password` por Resend, cambio de contraseña, tabla de tokens de reseteo y read API keys.
- **Datos**: SQLite con Drizzle (`better-sqlite3`). Tablas: `users`, `read_api_keys`, `password_reset_tokens`, `product_types`, `product_type_fields`, `products`, `product_field_values`, `product_images`, `slots`, `check_logs`.

## 4. Diseño propuesto

### 4.1 Proyecto en la plataforma

- Id `links_referidos` (alta con `npm run alta` en `base-compartida`, o la herramienta `alta` del MCP): schema `links_referidos`, rol `links_referidos_owner`. Nombres globales con prefijo: Edge Functions `links_referidos-r` y `links_referidos-check`, job de cron `links_referidos-check`, secretos de Vault `links_referidos_*`.
- Migraciones en `supabase/migrations/` de este repo: las normales con `migrar` (MCP `base-compartida`), las `*_global.sql` (FK a `auth.users`, cron, Vault) las aplica la plataforma.
- **Auto-registro apagado**: el dueño se da de alta a mano (`npm run acceso -- dar <email> links_referidos`).

### 4.2 Modelo de datos

- Se conservan `products`, `product_images`, `product_types`, `product_type_fields`, `product_field_values`, `slots` y `check_logs`, con `owner_user_id uuid` apuntando a `auth.users(id)` (FK en un `*_global.sql`).
- **Desaparecen** `users`, `password_reset_tokens` y `read_api_keys`: los reemplazan Auth y la clave pública (anon) de Supabase.
- Cambios de tipos esperables: timestamps a `timestamptz`, el array `apps` a `text[]` (con índice GIN), el índice único parcial `(product_id, dominio, priority) where status = 'active'` pasa tal cual (Postgres lo soporta).
- RLS en todas las tablas: el dueño ve y escribe lo suyo (`owner_user_id = plataforma.uid() and plataforma.es_miembro('links_referidos')`).

### 4.3 Lectura pública desde las apps

Los usuarios de las apps **no se registran**, así que la lectura tiene que poder hacerla `anon`. No se abre la tabla (con RLS por dueño un anónimo no vería nada): se expone **una función**:

```
links_referidos.catalogo(p_app text) → jsonb
```

- `security definer`, `set search_path = ''`, `grant execute ... to anon, authenticated`. Devuelve solo productos que tienen algún slot `active` para esa app, y solo campos públicos.
- **Misma forma de respuesta que `GET /v1/products`** (`id`, `titulo`, `descripcion_corta`, `imagen_url`, `imagenes`, `categoria`, `slots[{dominio, status, cta_url}]`): las apps cambian solo el transporte (el `fetch` de `api.ts`), no su parseo.
- Llamada desde una app: `POST {SUPABASE_URL}/rest/v1/rpc/catalogo` con `apikey: <publishable key>` y `Content-Profile: links_referidos` (o `supabase.schema('links_referidos').rpc('catalogo', { p_app })`).
- `plataforma.auditar()` va a marcar esta función como aviso ("SECURITY DEFINER sin `es_miembro`"): es esperado, igual que `menu.username_disponible`. Ver la mejora de la plataforma en §9 (L1).
- Hoy hay un solo dueño, así que el nombre de app alcanza para identificar el espacio. Si hubiera más de un dueño con apps de igual nombre, `catalogo` recibiría también el dueño. No se resuelve ahora.

### 4.4 Redirect

Edge Function pública `links_referidos-r` (sin verificación de JWT): misma lógica que hoy (`302` al slot activo de menor prioridad, `410` si no hay). El `cta_url` lo arma el servidor: cambiar el host del redirect es un cambio **de servidor**, no de las apps, siempre que las apps acepten un `cta_url` absoluto (hoy `resolveStoreUrl` lo concatena a `API_BASE_URL`; hay que corregirlo en L3). Mientras haya versiones viejas de las apps en circulación, el redirect de Fly se deja vivo un tiempo.

### 4.5 Verificador

`pg_cron` (cada 12 h) → `net.http_post` a la Edge Function `links_referidos-check`, con un secreto en Vault: el mismo patrón que ya usa `banco_links-check-links` en la base compartida. Se reutiliza la lógica de `apps/api/src/checker/` (Mercado Libre por API, chequeo débil con User-Agent de navegador, detección del captcha de Amazon, umbral de 2 fallos). Reemplaza al workflow de GitHub Actions.

### 4.6 Dashboard y MCP

- El dashboard usa `supabase-js` con el login único y las políticas RLS: se eliminan `auth/password.ts`, el JWT propio, el cambio de contraseña y el "olvidé mi contraseña" propio. "Olvidé mi contraseña" pasa a ser el de Supabase Auth, que necesita un SMTP: ya usás **Resend**, que sirve como SMTP propio de Auth (ver `../base-compartida/docs/AUTH.md`, decisión D1, hoy postergada).
- `apps/mcp` sigue siendo la forma de administrar productos conversacionalmente; cambia a hablar con Supabase en lugar de `/admin/*`. No se superpone con el MCP `base-compartida`: ese maneja el schema y las migraciones, **no** escribe datos de negocio por diseño.

### 4.7 Backups

Con plan Free **no se asume que haya backups** (verificar, §8). Mientras tanto, un `pg_dump` periódico del schema `links_referidos` a un lugar propio (por ejemplo el mismo GitHub Actions que hoy dispara el verificador). Esto reemplaza al Litestream que sigue pendiente.

## 5. Mejoras que trae

1. **Sin API key en el bundle**: desaparece `EXPO_PUBLIC_LINKS_API_KEY` y su gestión (alta, revocación, rotación). La clave publicable de Supabase ya es pública por diseño.
2. **Una sola fuente de verdad** con RLS, en lugar de aislamiento por filtro en cada endpoint (riesgo documentado en `04-alcance-y-limitaciones.md`).
3. **Login único**: se borra el código de autenticación propio (contraseñas, JWT, reseteo, cambio de contraseña, tokens), y el dueño entra al dashboard con la misma cuenta de sus otras apps.
4. **Menos operación**: sin volumen de Fly, sin Litestream, sin secrets de Fly, sin migraciones al arrancar el contenedor.
5. **Auditoría y reglas de la plataforma**: `plataforma.auditar()`, revisión de migraciones y guardas automáticas de RLS se aplican también a este proyecto.
6. **Una app consumidora más simple**: un `rpc` en vez de un `fetch` con cabeceras, timeout y manejo de 401/403/5xx propio. Las apps ya tienen caché local (Libros en `menu`).
7. **Un solo lugar donde mirar**: usuarios, uso y estado de todos los proyectos en `npm run uso` y `npm run auditar`.
8. **Posible ahorro** de ~US$2–3/mes de Fly (matizado en §6, riesgo 3).

## 6. Desventajas y riesgos

| # | Riesgo | Gravedad | Mitigación |
|---|---|---|---|
| 1 | **Pausa del plan Free** tras una semana sin actividad: se caen **todos** los links de **todas** las apps y también los demás proyectos de la base compartida. Hoy el redirect en Fly responde aunque la base compartida esté pausada | Alta | Mientras la base compartida siga en Free: no apagar Fly (parar en L3, §9). Antes de L4: actividad programada desde afuera (verificar si cuenta como actividad, §8), caché en cada app y monitoreo de uptime del redirect |
| 2 | **Acople**: la monetización de tres apps pasa a depender de una base compartida. Límite medido: `max_connections = 60` en toda la base | Media | Las apps usan la API REST (el pool lo maneja Supabase), no conexiones directas; `statement_timeout` y límites por rol en el alta |
| 3 | El ahorro de Fly puede ser nulo: si la base compartida necesita el plan Pro (~US$25/mes) para evitar la pausa, es 8–10 veces el costo actual de este servicio | Media | El costo se reparte entre todos los proyectos; decidir con el resto del plan (§7 y D2) |
| 4 | **Sin backups asegurados** en Free (verificar) | Media (hoy tampoco hay) | `pg_dump` periódico (§4.7) hasta tener plan con backups |
| 5 | **Esfuerzo de reescritura**: Drizzle de SQLite a Postgres, tests, rutas, dashboard con otro cliente | Media | Etapas independientes (§9); `drizzle-orm` soporta Postgres con el mismo esquema, como adelantaba el 08 |
| 6 | **Edge Functions**: arranque en frío y tope de tiempo por ejecución (para el verificador, que hoy recorre todos los slots) | Media | Verificar los límites del plan Free; procesar por lotes; el redirect es una consulta, no depende de esto |
| 7 | **Amazon puede bloquear más a las IPs de Supabase que a las de Fly**, y el verificador ya está al límite de lo confiable (`06`) | Media | Probar el verificador desde una Edge Function antes de apagar el workflow de GitHub Actions |
| 8 | **Lectura pública**: cualquiera con la clave publicable puede llamar `catalogo(app)` y listar los productos de una app | Baja | Son datos que la app ya muestra públicamente; la función devuelve solo campos públicos |
| 9 | **Desarrollo local**: hoy `npm run dev` funciona sin Docker ni servicios; con Postgres hace falta una base local | Baja | Docker no está instalado en la máquina del usuario: usar el Supabase simulado con PGlite que ya existe en `../base-compartida/test/integracion/` (o instalar Docker más adelante) |
| 10 | Dos MCP conviven (`links-referidos` y `base-compartida`) y puede confundir a una sesión | Baja | Las instrucciones de cada uno dicen qué hace; este documento y el `CLAUDE.md` del repo lo aclaran |

## 7. Decisiones

Registro de lo hablado con el usuario el 2026-11-05.

| # | Tema | Decisión |
|---|---|---|
| D0 | Plan de la base compartida | **Free** (dato del usuario) |
| D1 | Consumidores | `menu`, `switch` (el "despertador-app") y, pronto, `respira` |
| D2 | **Qué hacer con la pausa del plan Free** | Pendiente. Por defecto el plan **para en L3** (los datos y la lectura en la base compartida, con Fly todavía en pie para el redirect y el verificador). Seguir con L4–L6 recién con una de estas: plan Pro, o una actividad programada que se compruebe que evita la pausa |
| D3 | **Redirect** | El usuario preguntó qué es. Explicación sencilla: cuando alguien toca "Comprar en Amazon" en una app, el botón no lleva el link de afiliado escrito dentro, sino una dirección fija tuya (`.../r/<producto>/<tienda>`) que **en ese momento** decide a qué link mandarlo; si el link se rompió, usa el siguiente de la cola; si no queda ninguno, devuelve un error para que la app oculte el botón. Eso es lo que permite cambiar un link sin actualizar las apps. **Decisión por defecto: se mantiene** (hoy lo usan `menu` y `switch`). Confirmar si querés dejarlo como está |
| D4 | Registro de clics | **No existe hoy.** No se agrega en esta migración; si se quisiera, es una tabla `clicks` que escribiría la Edge Function (mejora aparte) |
| D5 | Auto-registro | Apagado; el dueño entra por membresía |
| D6 | Prioridad | Baja: no se hace hoy. Se retoma cuando el usuario abra una sesión para este proyecto |

## 8. Supuestos sin verificar (hacerlo antes de L4)

- Límites vigentes del plan Free (tamaño de base, invocaciones y tiempo de ejecución de Edge Functions, egreso) contra el uso real de este servicio, que es chico.
- Si el plan Free incluye backups utilizables.
- Si una tarea programada (`pg_cron` interno, o un ping externo) cuenta como actividad para evitar la pausa.
- Si Amazon y Mercado Libre responden igual a las IPs de las Edge Functions que a las de Fly (probar el verificador real).
- Que el `cta_url` absoluto no rompa nada en las versiones de las apps ya instaladas.

## 9. Plan de sesiones

Cada sesión es una conversación nueva de Claude Code. **Cada etapa deja el sistema funcionando y se puede dejar ahí.** Contra la base compartida se trabaja con el MCP `base-compartida` (lectura primero; lo que escribe pide confirmación). Antes de tocar el dashboard o la base en producción, confirmar con el usuario.

| Sesión | Dónde | Qué | Terminado cuando |
|---|---|---|---|
| **L0** | Usuario | Resolver D2 y D3; verificar los supuestos de §8 que se puedan | Decisiones anotadas en §7 |
| **L1** | `base-compartida` y este repo | Alta del proyecto `links_referidos`; esquema en Postgres (traducción del esquema de Drizzle) con RLS y membresía; FK a `auth.users` en un `*_global.sql`; función `catalogo`; tests con PGlite. Mejora de la plataforma: poder marcar una función como "pública a propósito" para que `auditar()` no la avise cada vez | `npm test` y `npm run auditar` sin errores en `base-compartida`; `catalogo` devuelve la misma forma que `/v1/products` sobre datos de prueba |
| **L2** | Este repo | Migrar los datos (script de una sola vez, con `--dry` y conteos por tabla); la API de Fly pasa de SQLite a Postgres (Drizzle `pg`, conexión como `links_referidos_owner` por el pooler); prueba de paridad de las respuestas viejas contra las nuevas | Dashboard y redirect funcionan en producción sobre Postgres; hay una sola fuente de verdad |
| **L3** | `menu`, `switch`, `respira` | Cada app lee con `rpc('catalogo')` en lugar de `/v1/products`; `resolveStoreUrl` acepta `cta_url` absolutos; se quita `EXPO_PUBLIC_LINKS_API_KEY`; se agregan la URL y la clave publicable de Supabase a las que no las tengan; se conserva la caché | Las tres apps muestran los productos sin la API de Fly para leer. **Punto de parada recomendado mientras la base sea Free (D2)** |
| **L4** | Este repo + `base-compartida` | Redirect como Edge Function `links_referidos-r`; verificador como `links_referidos-check` con `pg_cron` y Vault; `cta_url` pasa a apuntar a la función; Fly queda como respaldo del redirect durante un período | El flujo botón → redirect → verificador corre en Supabase; el verificador probado contra Amazon y Mercado Libre reales |
| **L5** | Este repo | Dashboard y MCP con `supabase-js` y el login único; se elimina el código de auth propio; "olvidé mi contraseña" por Auth con Resend como SMTP | Se administra todo con la cuenta compartida; sin tablas ni endpoints de usuarios |
| **L6** | Usuario + este repo | Apagar Fly: monitoreo de uptime, `pg_dump` periódico, eliminar el workflow viejo, borrar la app de Fly, cerrar este documento | Fly apagado y todo verificado; documentación final |

Efecto en la plataforma (`../base-compartida/docs/PLAN.md`, sesión S6): se anota allí como pendiente no prioritaria, con la mejora de `auditar()` y la documentación del patrón de "lectura pública por función".

## 10. Reglas durante la migración

- No apagar nada de Fly hasta tener la etapa siguiente funcionando **y** verificada.
- Los datos se copian, no se mueven: la base de SQLite queda intacta hasta L6.
- Nada de `supabase db push`, `db reset --linked` ni `config push` contra la base compartida (regla de la plataforma).
- Los cambios de esquema van en `supabase/migrations/` de este repo y se aplican con el MCP `base-compartida`; los `*_global.sql` los aplica la plataforma.
- Confirmar con el usuario antes de tocar el dashboard en producción, el proyecto de Fly o Supabase.
