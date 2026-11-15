# Por qué Fly.io (con SQLite) y no Supabase

> **Actualización 2026-11-05:** este documento describe la decisión original y sigue siendo cierto para lo que hoy corre. Desde que existe una base Supabase compartida entre los proyectos del usuario, se evalúa migrar los datos y la lectura de las apps ahí, y los criterios de §4 se reexaminaron uno por uno: ver `09-migracion-a-base-compartida.md` (propuesta, no iniciada). Lo de §2.2 (la pausa del plan Free) **sigue siendo el principal riesgo**.

Complemento de `03-stack-tecnologico.md` §3.1 y de `07-fly-io-vs-turso.md`. Aviso previo para leerlo bien: **no son lo mismo que se comparan**. Fly.io es dónde *corre* la API (cómputo + disco); Supabase es un backend-as-a-service (Postgres administrado + auth + storage + funciones). La decisión real que se tomó fue **"SQLite en el mismo contenedor que la API"** (§3.1), y Fly.io salió de ahí, no al revés.

## 1. Qué es cada uno, para este proyecto

| | Fly.io (lo que usamos) | Supabase |
|---|---|---|
| Qué ofrece | Una VM donde corre el contenedor de la API + un volumen de disco | Postgres administrado + login de usuarios + storage de archivos + edge functions |
| Dónde queda la base | Un archivo SQLite (`/data/prod.db`) dentro de la misma máquina que la API | Un servidor Postgres aparte, al que la API se conecta por red |
| Corre el código de la API | Sí | No directamente: habría que seguir hosteando Fastify en otro lado, o reescribirlo como edge functions |

## 2. Las razones por las que se eligió Fly.io + SQLite

1. **Costo y simplicidad con un solo desarrollador.** Fly cuesta ~US$2–3/mes con tarjeta (VM `shared-cpu-1x` chica + 1GB de volumen, ver `07-fly-io-vs-turso.md` §3) y es *una sola cosa que mantener*: la API y su base viven juntas. Con Supabase habría dos servicios (la API en algún host + el Postgres), con sus credenciales y latencia de red entre ambos.
2. **El plan gratis de Supabase no sirve para este caso de uso.** Los proyectos gratis se *pausan tras una semana sin actividad* (según los precios publicados a 2026) — pero el endpoint más importante de este proyecto es el redirect de los botones de compra (`GET /r/{id}/{dominio}`), que tiene que responder a cualquier hora, incluso si nadie entró al panel en meses. Evitar la pausa exige el plan Pro (~US$25/mes), 8–10 veces el costo actual de todo el sistema.
3. **No necesitamos lo que Supabase tiene de más.** Auth, storage de archivos y realtime son su gran valor, y acá no pesan: el login ya está hecho (`auth/password.ts`, JWT con `jose`), las imágenes de producto son solo URLs externas, y nada es en tiempo real.
4. **Lecturas locales, sin red de por medio.** Con SQLite el redirect lee de un archivo en el mismo disco; con Postgres remoto cada click suma un viaje de red a la base. A este volumen no se nota, pero tampoco hay ganancia que lo justifique.
5. **Menos superficie para romper.** Un contenedor + un archivo es un modelo fácil de razonar (y de levantar en local con `npm run dev`, sin Docker ni servicios externos).

## 3. Qué se pierde con esta decisión (el costo honesto)

- **Un solo proceso escritor.** SQLite en un volumen atado a *una* máquina impide escalar horizontalmente (varias instancias escribiendo a la vez). Hoy con tráfico bajo no importa; es el techo del diseño (ya anotado en `04-alcance-y-limitaciones.md`, "Escala deliberadamente chica").
- **Backups por cuenta propia.** Supabase Pro incluye backups diarios; acá el volumen de Fly toma snapshots (retención de 5 hoy) pero el respaldo continuo con Litestream a un bucket **sigue pendiente de configurar**. Hasta que no esté, perder el volumen es perder la base.
- **Más trabajo operativo propio:** migraciones al arrancar, secrets, deploys, el comportamiento de volúmenes en Fly (ya mordió: el `release_command` no tiene el volumen montado, ver `fly.api.toml`).
- **Se descartó cuando éramos single-tenant.** La nota original de §3.1 dejó Supabase/Neon como "reconsiderar si migra a multi-tenant con varios usuarios concurrentes" — el proyecto *ya es* multi-tenant (cuentas con email+contraseña, aislamiento por `owner_user_id` en cada query), aunque con un solo usuario real todavía. Con Postgres, el aislamiento podría reforzarse a nivel base (Row Level Security) en vez de depender de recordar el filtro en cada endpoint (riesgo que sí está documentado en `04-alcance-y-limitaciones.md`).

## 4. Cuándo convendría reconsiderar Supabase (o Postgres administrado en general)

- Aparecen **varios usuarios reales escribiendo a la vez**, o hace falta más de una instancia de la API.
- Se quiere **aislamiento garantizado por la base** (RLS) en vez de por convención de código.
- El costo de mantener backups/operación propia deja de compensar los ~US$25/mes de un plan administrado.
- Se necesita auth social (Google/GitHub login), storage de imágenes propio o realtime, que hoy no están.

Mientras ninguna de esas se cumpla, el costo/beneficio sigue a favor de la opción actual. Si alguna se cumple, el camino es migrar la capa de datos (Drizzle soporta Postgres con el mismo esquema casi sin cambios de lógica), no rehacer la API.

Sources (datos de Supabase a 2026):
- [Supabase Pricing in 2026: Plans, Free Tier Limits & Full Breakdown](https://uibakery.io/blog/supabase-pricing)
- [Supabase Pricing 2026: Free Tier Limits & Real Costs](https://designrevision.com/blog/supabase-pricing)
- [Supabase Pricing: 2026 Guide to Plans, Limits, and Real-World Costs](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/)
