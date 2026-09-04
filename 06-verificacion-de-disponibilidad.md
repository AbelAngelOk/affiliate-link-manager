# Cómo se valida que un link ya no funcione

"¿Este link sigue vivo?" no es una sola pregunta — depende de qué `dominio` tiene el slot, porque cada plataforma expone (o no) una forma confiable de preguntárselo directamente. Esta es la estrategia real, implementada en `apps/api/src/checker/`, no un ideal a futuro.

## 1. El problema de fondo

Hay tres formas posibles de chequear un link de afiliado, de más a menos confiable:

1. **Preguntarle a una API oficial del marketplace** "¿este producto sigue activo?" — la única fuente de verdad real.
2. **Mirar el contenido de la página** (buscar texto tipo "no disponible") — heurística, se rompe si cambian el texto o el idioma.
3. **Mirar solo el código HTTP de la respuesta** — la señal más débil: un sitio puede devolver `200` para una página de "producto no encontrado" (falso positivo de "está OK"), o bloquear la request por parecer un bot y devolver `403`/`429` aunque el producto esté perfecto (falso positivo de "está roto").

La estrategia de este proyecto usa la opción 1 siempre que el dominio lo permite, y cae a una combinación de 2 y 3 cuando no (§2.3).

## 2. Estrategia por dominio (lo que corre hoy)

El punto de entrada es `checkOne()` en `checker/runCheck.ts`, que decide la rama según el campo `dominio` del slot:

```ts
function isMercadoLibre(dominio: string): boolean {
  return dominio.includes("mercadolibre");
}
```

### 2.1 Dominios de Mercado Libre (`mercadolibre.com.ar`, `mercadolibre.com.mx`, etc.)

**Paso 1 — intentar extraer el `item_id` de la URL del link** (`checker/mercadolibre.ts`):

```ts
const ITEM_ID_PATTERN = /\b(ML[ABCV])-?(\d{5,})\b/i;
```

Esto matchea URLs de producto directas, tipo `articulo.mercadolibre.com.ar/MLA-1234567890-...`. **No** matchea los links que genera el panel de afiliados por defecto, tipo `mercadolibre.com.ar/social/usuario?matt_word=...` — esos son links de tracking/redirect, el ID no está en la URL (ver `02-gestion-links-afiliados.md`).

**Si se pudo extraer el `item_id`** → se usa la API pública real de Mercado Libre, que es una fuente de verdad de verdad:

```ts
GET https://api.mercadolibre.com/items/{item_id}
```
- `404` → el ítem no existe → roto.
- `status !== "active"` (`paused`, `closed`, `under_review`, ...) → roto.
- `status === "active"` → vivo.

**Si NO se pudo extraer el `item_id`** (el caso típico de un link de afiliado real) → cae al chequeo débil (§2.3).

### 2.2 Dominios de Amazon (`amazon.com`, `amazon.com.mx`, etc.)

Amazon no tiene un equivalente accesible al endpoint público de Mercado Libre. La vía "correcta" (Creators API) existe pero tiene una barrera de entrada real: **exige 10 ventas calificadas en los últimos 30 días** para dar acceso (ver `04-alcance-y-limitaciones.md`) — una cuenta nueva, sin historial, no puede usarla. Mientras esa condición no se cumpla, Amazon **siempre** cae al chequeo débil (§2.3).

### 2.3 Chequeo débil (fallback común a Amazon y a Mercado Libre sin `item_id`)

`checker/weakHttpCheck.ts` — lo único disponible cuando no hay una API real que preguntar. Tiene tres capas, en este orden:

```ts
const res = await fetch(url, {
  method: "GET",
  redirect: "follow",
  headers: { "User-Agent": BROWSER_USER_AGENT }, // navegador real, no el default de fetch()
});

// 1) status >= 400 → roto
// 2) status < 400 pero el body matchea un marcador de bloqueo anti-bot → roto
//    (detalle aclara que es un bloqueo, no un producto confirmado muerto)
// 3) status < 400 pero el body matchea una frase de "no disponible" → roto
// 4) nada de lo anterior → "ok" (señal débil, sigue sin ser una confirmación)
```

**Confirmado empíricamente esta sesión, no es teórico:**
- Una URL de producto de Amazon inexistente devolvió `200 OK`, pero **no** era la página del producto ni un "no disponible" — era la pantalla de verificación anti-bot de Amazon (`/errors_page/validateCaptcha`, texto "Haz clic en el botón de abajo para continuar comprando"). El chequeo por status code por sí solo no distingue esto de un link que funciona.
- Un link de afiliado de Mercado Libre tipo `social/...?matt_word=...` devolvió `403` con el User-Agent por defecto de `fetch()`; con un User-Agent de navegador el mismo link pasó a devolver `404` — un cambio real de comportamiento (aunque en este caso puntual el `404` es igual de válido, porque la URL de prueba usa un usuario de afiliado inventado — no se pudo confirmar el efecto sobre un link real).

**Lo que se implementó a partir de esto:**
1. **User-Agent de navegador real** en vez del default de `fetch()` — ataca el falso "roto" de Mercado Libre.
2. **Detección del bloqueo anti-bot de Amazon** buscando el texto real confirmado arriba (`validateCaptcha`, "Continuar a Compras", y el equivalente en inglés "enter the characters you see below") — a esto se lo trata como `fail`, pero con un `detalle` que dice explícitamente "no se pudo confirmar, no implica que esté roto", para no confundirlo con un producto realmente dado de baja.
3. **Lista de frases de "no disponible" genuino** (`currently unavailable`, `page not found`, etc.) — esta parte **sigue sin verificar contra un caso real** (ver la nota de la investigación más abajo, ahora en §2.4): no se pudo forzar una página de producto genuinamente descontinuado, todos los intentos con ASIN inventados terminaron en el captcha de arriba, no en un "no disponible" real.

Por eso el chequeo débil nunca se trata como fuente de verdad — ver el umbral de fallos consecutivos (§3) como mitigación parcial.

### 2.4 Lo que quedó sin poder verificar

La lista de frases de "no disponible" genuino (punto 3 arriba) es un punto de partida, no algo confirmado — a diferencia del marcador de captcha (que sí se vio en vivo), esta lista viene de conocimiento general sobre cómo suelen ser estos mensajes, no de un caso real observado. Cada vez que un slot pasa a `broken` por este motivo, el `detalle` en `check_logs` dice exactamente qué frase disparó el resultado — revisar eso con el tiempo es la forma de confirmar o corregir la lista, en vez de confiar en ella a ciegas.

## 3. Umbral de fallos consecutivos

Un slot no pasa a `broken` en el primer chequeo fallido — hace falta que **2 corridas seguidas** den `fail` (`FAILURE_THRESHOLD = 2` en `runCheck.ts`), consultando el historial en `check_logs`. Esto absorbe caídas puntuales de red o bloqueos temporales, que son más comunes con el chequeo débil que con la API real de Mercado Libre. Aplica igual a las corridas manuales (§3.1) que a la periódica — un solo click no alcanza para romper un slot.

### 3.1 Disparadores manuales (además del cron)

Todo lo de arriba corre automático cada 12-24h vía `POST /internal/check` (Etapa 7). Pero además se puede disparar a demanda, con distinto alcance según qué tan puntual sea lo que se quiere revisar — la misma lógica de `checkSlots()` en los tres casos, solo cambia qué lista de slots se le pasa:

| Alcance | Endpoint | Desde el panel |
|---|---|---|
| Un slot puntual | `POST /admin/slots/{id}/check` | Botón "Validar" en cada fila de `/slots` y del detalle de un producto |
| Todos los slots de un producto | `POST /admin/products/{id}/check` | Botón "Validar" en cada fila de `/productos`, y "Validar todos" arriba de la tabla de slots del detalle |
| Todos los slots de todos los productos de una app | `POST /admin/apps/{nombre}/check` | Botón "Validar" en cada fila de `/apps` |

El de app no tiene una tabla propia en la base (no hay entidad `App`, ver `01-solucion-final.md` §2) — resuelve primero qué productos tienen ese nombre en su `apps[]` (mismo filtro que usa `GET /v1/products?app=`) y corre el chequeo sobre los slots de todos esos productos juntos.

## 4. Resumen de confiabilidad

| Dominio / caso | Mecanismo | ¿Fuente de verdad? | Falla conocida |
|---|---|---|---|
| `mercadolibre.*` con `item_id` extraíble | API pública de Mercado Libre | Sí | Ninguna detectada — es la señal fuerte del sistema |
| `mercadolibre.*` sin `item_id` (link de afiliado típico) | Chequeo débil + User-Agent de navegador | No | Bloqueo por bot-detection, mitigado pero no descartado — no se pudo confirmar contra un link real (§2.4) |
| `amazon.*` | Chequeo débil + detección de captcha + frases de "no disponible" | No | El bloqueo anti-bot de Amazon se detecta y se distingue de un producto muerto; las frases de "no disponible" genuino siguen sin verificar (§2.4) |
| Cualquier dominio desconocido | Chequeo débil (mismas 3 capas) | No | Mismas limitaciones que arriba |

## 5. Mejoras implementadas esta sesión

Las tres mejoras que estaban listadas acá como "posibles" ya se implementaron en `checker/weakHttpCheck.ts` (ver §2.3-2.4 para el detalle y las limitaciones que quedaron):

- User-Agent de navegador real.
- Detección del bloqueo anti-bot de Amazon (confirmado en vivo).
- Lista de frases de "no disponible" genuino (sin verificar contra un caso real todavía).

## 6. Mejoras pendientes (no implementadas)

- **Seguir el redirect de los links `matt_word` hasta el final y volver a intentar extraer el `item_id`** de la URL resultante. La mayoría de estos links terminan resolviendo a una URL de producto directa después de 1-2 redirects — si se logra extraer el ID ahí, el caso "sin `item_id`" (§2.1, débil) se convierte en el caso fuerte (API real). Sigue siendo la mejora con mejor relación esfuerzo/beneficio pendiente.
- **Usar la Creators API de Amazon apenas la cuenta cumpla el mínimo de ventas** — es la única vía que convierte a Amazon en una fuente de verdad real, pero depende de una condición externa (ventas) que no se puede forzar.

## 7. Cómo se extendería a un proveedor nuevo

Si mañana se agrega otro marketplace (ej. AliExpress), el patrón a seguir es el mismo que ya existe:

1. Agregar una función `isAliExpress(dominio)` (o generalizar `isMercadoLibre` a un detector por proveedor).
2. Si el proveedor tiene una API pública de consulta de productos, escribir un `checkAliExpressItem()` análogo a `checkMercadoLibreItem()` — intentar SIEMPRE la fuente de verdad real primero.
3. Si no hay API accesible (o no se puede identificar el producto desde la URL), cae a `weakHttpCheck()` — ya genérico, no hace falta tocarlo.
4. `checkOne()` en `runCheck.ts` es el único lugar que necesita el nuevo `if`.
