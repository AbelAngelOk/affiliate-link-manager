# Fly.io vs. Turso — no son lo mismo

Se pidió esta comparación en el momento en que Fly.io mostró el bloqueo real: la cuenta trial apaga la máquina cada 5 minutos hasta que se carga una tarjeta. Antes de comparar precios, la aclaración más importante es que **Fly.io y Turso no resuelven el mismo problema** — no es una elección de "cuál es mejor" en abstracto, es una elección de "qué capa de la arquitectura cambio".

## 1. Qué es cada uno

- **Fly.io** es una plataforma de **cómputo**: corre el contenedor Docker de la API (Node.js + Fastify) en una VM (Firecracker), con un volumen persistente para el archivo SQLite. Es el "dónde vive tu servidor" — equivalente a un VPS administrado.
- **Turso** es una **base de datos como servicio**, compatible con SQLite (libSQL, un fork de SQLite con replicación). No corre código de aplicación — solo guarda los datos y los sirve por red. Es un reemplazo de "el archivo `.db` + `better-sqlite3`", no un reemplazo de Fly.io.

Si se migrara a Turso, **igual hace falta un servidor corriendo la API en algún lado** (podría seguir siendo Fly.io, u otra cosa). Lo que cambia es que ese servidor deja de necesitar disco persistente propio — la base pasa a vivir en la red, no en un volumen atado a una máquina puntual.

## 2. El bloqueo actual, en detalle

Fly.io da una cuenta nueva sin pedir tarjeta, pero el trial es chico: **2 horas de VM o 7 días, lo que pase primero** — y cada corrida individual de una máquina se corta a los 5 minutos si no hay tarjeta cargada. Es exactamente lo que se vio en el deploy: la máquina se apaga sola con el mensaje "Trial machine stopping."

Una vez cargada la tarjeta, el trial termina y pasa a facturación por uso — no hay una franja mensual gratis documentada oficialmente para cómputo/volumen más allá de esa ventana inicial.

## 3. Costo real de seguir en Fly.io (con tarjeta)

Para el tamaño de este proyecto (una VM chica, `shared-cpu-1x` / 256MB, corriendo todo el mes, más el volumen de 1GB para SQLite):

| Ítem | Costo |
|---|---|
| VM `shared-cpu-1x` 256MB, 24/7 | ~US$2/mes (varía por región) |
| Volumen persistente (1GB) | ~US$0.15/mes |
| Bandwidth saliente | US$0.02–0.12/GB (el tráfico entrante es gratis) — para el volumen de esta API, prácticamente despreciable |
| **Total estimado** | **~US$2–3/mes** |

No hay cambio de código: es agregar una tarjeta y seguir exactamente con lo que ya está deployado y probado.

## 4. Costo real de Turso

El free tier de Turso es notablemente generoso y **no pide tarjeta**:

| Ítem | Free tier |
|---|---|
| Bases de datos | hasta 100 |
| Storage | 5GB |
| Lecturas de filas/mes | 500 millones |
| Escrituras de filas/mes | 10 millones |

Para el volumen de este proyecto (bajo tráfico, un puñado de productos/slots), se queda cómodamente dentro del free tier de manera indefinida — no hay un escenario realista donde este proyecto empiece a pagar por Turso.

**Pero migrar tiene costo de implementación, no de dinero:**
- Reemplazar `better-sqlite3` (acceso a archivo local) por `@libsql/client` (acceso por red) en `apps/api/src/db/client.ts` — drizzle-orm sí tiene un driver para libSQL, así que no es reescribir el ORM, pero es un cambio real de dependencia y de cómo se conecta.
- Cada query pasa a tener latencia de red en vez de ser acceso a disco local — para este proyecto (bajo volumen, no hay queries en caliente tipo loop) no debería notarse, pero es una diferencia de arquitectura real.
- Sigue haciendo falta un host de cómputo para la API — si ese host también requiere tarjeta para andar 24/7 (varias plataformas "gratis" en 2026 exigen tarjeta o duermen la app en inactividad), el problema original no se resuelve del todo, solo se achica.
- Se simplifica una cosa a cambio: Turso maneja replicación/backups de la base él solo, así que **dejaría de hacer falta configurar Litestream** (que todavía estaba pendiente).

## 5. Recomendación

**Para este proyecto puntual, agregar la tarjeta a Fly.io es el camino más chico**: cero cambios de código, ya está todo deployado y probado, y el costo real (~US$2–3/mes) es bajo. Migrar a Turso tiene sentido si en algún momento se prioriza no depender de una tarjeta en absoluto, o si el proyecto creciera a un punto donde la replicación multi-región de Turso aporte algo real (no es el caso hoy, con un solo tenant y tráfico bajo) — pero tal como está ahora, cambiar de base de datos no resuelve el bloqueo actual por sí solo, porque el cómputo (correr la API) sigue necesitando un host, y ese es el problema, no el archivo SQLite en sí.

Sources:
- [Fly.io Free Trial](https://fly.io/docs/about/free-trial/)
- [Fly.io Resource Pricing](https://fly.io/docs/about/pricing/)
- [Turso Database Pricing](https://turso.tech/pricing)
