# Alcance y limitaciones

## 4.1 Alcance (qué resuelve la solución propuesta)

- Autenticación por API key para esta versión (single-tenant), con el modelo de datos ya preparado (`owner_user_id`) para migrar a OAuth multi-tenant sin cambiar el esquema el día que haga falta (ver `01-solucion-final.md` §3 y `03-stack-tecnologico.md` §3.3).
- Un producto puede asociarse a más de una app (el atributo `apps` es un array), y consultarse filtrado por app (`?app=nombre`).
- Límites de longitud fijados en el modelo para `titulo`, `descripcion_corta`, `descripcion_larga`, `imagen_alt` y `categoria`, aplicados en la escritura (no en cada app) — evita que un mismo producto se vea distinto/roto según qué app lo consuma (detalle en `01-solucion-final.md` §2.1).
- Especificación OpenAPI autogenerada, colección de Postman derivada de esa spec, y sitio de documentación pensado para consumo por humano, agente de IA (LLMO) y, si aplica, motores de búsqueda tradicionales/generativos (SEO/GEO).
- Dashboard web de CRUD sobre Products/Slots (cada Slot ya es un link + prioridad), como cliente más de la propia API (no una capa de datos aparte).
- Un producto puede tener presencia simultánea en Amazon (por país) y Mercado Libre (por país), representada como slots independientes (`Slot` = producto + proveedor + país).
- El usuario puede filtrar los slots de un producto por proveedor y por país, para armar sus propios botones (uno por Amazon, uno por Mercado Libre) del lado de su app.
- Un producto es visible/consultable en tanto tenga **al menos un** slot activo, sin importar de qué proveedor.
- Fallback automático *dentro* de un mismo slot: si el link vigente de un canal (ej. `amazon:mx`) deja de funcionar, se promueve automáticamente el siguiente link candidato cargado para ese mismo canal.
- Contrato explícito de disponibilidad vía código HTTP: `GET /r/{product_id}/{dominio}` devuelve `410 Gone` cuando ese dominio se queda sin ningún slot activo, para que la app pueda ocultar ese botón puntual sin tratarlo como error genérico.
- Verificación periódica y automatizada de disponibilidad, con estrategia distinta por proveedor.
- Alertas al usuario cuando un slot completo se queda sin ningún link activo.
- Panel para altas/bajas/reordenamiento manual de slots y sus links candidatos.

## 4.2 Fuera de alcance (explícitamente no cubierto por esta versión)

- **Búsqueda automática de productos sustitutos.** Encontrar "un libro parecido" cuando el original se discontinúa no es un problema resoluble de forma confiable con matching automático sin supervisión — el sistema *avisa rápido* (slot/producto sin ningún link activo), pero cargar el reemplazo sigue siendo tarea humana vía el panel.
- **Fallback automático entre proveedores.** El sistema *no* decide por sí solo "si Amazon MX no está, mostrar el botón de Mercado Libre en su lugar" — eso lo resuelve la app consumidora, mostrando/ocultando sus propios botones según qué dominios vengan activos. El fallback automático del sistema es únicamente dentro del mismo dominio, entre los `Slot` candidatos que lo comparten.
- **Reconciliación de comisiones/pagos.** El proyecto gestiona links y disponibilidad, no hace tracking de cuánto pagó cada plataforma ni concilia contra Mercado Pago o Amazon Payments.
- **Analítica avanzada / BI.** Se contempla un log mínimo de clicks por si en el futuro sirve para decidir prioridades, pero no un dashboard de conversión, A/B testing, etc.
- **Sincronización de inventario en tiempo real.** La verificación es periódica (cada 12–24h), no hay webhooks de Amazon/ML avisando "este producto se agotó ahora mismo".
- **Gestión de usuarios finales.** La autenticación de este proyecto identifica al *dueño del entorno* (vos), no a los usuarios finales de cada app cliente.
- **Marketplaces adicionales** (AliExpress, Falabella, etc.) — el diseño de `Slot.provider` lo permite a futuro, pero no está implementado ni investigado en esta versión.
- **Overrides de texto por app.** Si a futuro una app puntual necesitara un título/descripción distinto al mismo producto, no está resuelto en esta versión (se documentó como extensión natural en `01-solucion-final.md` §2.1, no como algo a construir ahora).
- **Contenido enriquecido (HTML/Markdown) en campos de producto.** Se decidió texto plano únicamente, precisamente para evitar el mismo tipo de desface entre apps que buscan resolver los límites de longitud.

## 4.3 Limitaciones técnicas y de las plataformas externas

### Amazon
- **Cobertura geográfica real**: Amazon Associates solo opera en 20 países. **Argentina no tiene programa propio** — un slot con dominio `amazon.com.ar` no es válido; si se quiere monetizar con Amazon desde Argentina, hay que hacerlo vía el programa de EE.UU. (dominio `amazon.com`), no uno "local".
- **Problema de arranque ("chicken-and-egg")**: la Creators API exige un mínimo de 10 ventas calificadas en 30 días para dar acceso. Una cuenta nueva, sin historial de ventas, **probablemente no va a poder consultar disponibilidad/precio de Amazon vía API desde el día uno**. Hay que planificar un período inicial donde:
  - la verificación de los `Slot` de Amazon es manual (revisión periódica del usuario), o
  - se usa una señal débil (chequeo HTTP del link) solo como alerta temprana, nunca como fuente de verdad, o
  - se evalúa contratar temporalmente un servicio de terceros de datos de producto mientras se acumula volumen de ventas propio.
- **PA-API 5.0 se retira el 15/05/2026**: cualquier integración debe apuntar directamente a la Creators API.
- **El chequeo débil por HTTP es más frágil de lo que parece — confirmado al implementarlo (Etapa 7):** una página de producto de Amazon inexistente respondió `200 OK` (Amazon sirve una página "no encontrado" con status 200 en vez de 404, así que el chequeo débil no detecta productos dados de baja); y un link de afiliado de Mercado Libre (tipo `social/usuario?matt_word=`) respondió `403` a una request sin headers de navegador real, aunque el producto detrás estuviera perfectamente activo — falso positivo de "roto". El checker de Mercado Libre evita este problema cuando puede extraer el `item_id` de la URL y usar la API pública real (ver más abajo), pero el chequeo débil (Amazon, y ML sin `item_id` parseable) queda documentado como una señal ruidosa en ambas direcciones, no solo optimista.
- **Regla de cloaking**: el endpoint `/r/{product_id}/{dominio}` es válido, pero cada botón de la app tiene que dejar claro antes del click que el destino es Amazon (texto, ícono) — no puede ser un link genérico sin contexto.
- **Regla de precios**: si en algún momento se muestra el precio de Amazon en la app (no solo el link), hay que refrescarlo cada ≤24h y mostrar cuándo se actualizó por última vez.
- **Declaración de sitios**: cada app nueva que use links de Amazon debe declararse manualmente en la cuenta de Associates — no es automatizable, es un paso de onboarding por app, independiente de que el nombre de la app ya figure en el `apps` de algún producto en este sistema.

### Mercado Libre
- **No hay API oficial para generar links de afiliado.** La creación de cada `Slot` de dominio ML siempre requiere un paso manual en el panel de afiliados — el sistema no puede "descubrir y linkear" productos de ML por sí solo, solo puede validar lo que ya fue cargado a mano.
- **available_quantity/sold_quantity son "referenciales"** en la API pública — no usar esos campos como única señal de "se agotó", apoyarse principalmente en el campo `status` del item.
- **Autenticación creciente**: cada vez más llamados a la API pública de ML piden credenciales de app (OAuth propio de ML, aparte del OAuth de este proyecto), aunque sean lecturas. Conviene registrar la app de ML desde el arranque.
- **Restricción de tipo de link**: solo product pages o listas de afiliados — coincide con el diseño (cada `Slot` es un producto puntual), pero es una restricción real que hay que respetar al cargar links.
- **Multi-país real**: a diferencia de Amazon, Mercado Libre sí opera en Argentina (sitio MLA). Los IDs de item (MLA/MLM/MLB…) son específicos de cada sitio; un mismo producto "global" necesita un slot `mercadolibre` separado por país.
- **No todos los links de afiliado de ML contienen el `item_id` en la URL.** Los links tipo `mercadolibre.com.ar/social/usuario?matt_word=...` (el formato que genera el panel de afiliados) son links de tracking/redirect, no URLs de producto directas — el checker no puede extraer el ID ahí y cae al chequeo débil por HTTP (con los falsos positivos de la nota anterior). Cuando el link cargado sí es una URL de producto directa (`articulo.mercadolibre.com.ar/MLA-123...`), el checker usa la API pública real y el chequeo es confiable. Vale la pena, al cargar links en el panel, preferir la URL directa del producto cuando esté disponible.

### Multi-tenant (email + contraseña)
- **El registro es público y sin verificación de email**: `POST /auth/register` no manda ningún correo de confirmación — cualquiera puede crear una cuenta con cualquier email, incluido uno que no controla. No es explotable más allá de "alguien puede registrar una cuenta con tu email sin poder después demostrarlo" (no hay flujo de "recuperar contraseña" que dependa de poseer ese email tampoco, ver dos puntos abajo), pero si en algún momento se necesitara certeza real de que el dueño del email es quien se registró, hace falta agregar verificación por link.
- **Cambiar contraseña sí está resuelto (`PATCH /admin/password`, requiere la actual), "olvidé mi contraseña" no.** Si alguien pierde el acceso sin tener la contraseña vieja a mano, hoy no hay forma de recuperar esa cuenta (ni siquiera vos como operador — no hay ningún rol con esa capacidad, ver siguiente punto) — falta elegir un proveedor de envío de email para el flujo de recuperación por link, que no está en el stack todavía.
- **Sin rol "root" ni panel de soporte**: a diferencia de la v1 (donde vos eras la única cuenta posible), ahora cualquiera puede tener una cuenta y no hay ninguna cuenta con permisos para ver o intervenir las de otros. Operacionalmente, si hace falta ayudar a alguien con su cuenta hoy solo se puede hacer manipulando la base de datos directamente.
- **El riesgo de aislamiento es de aplicación, no solo de infraestructura**: cada endpoint filtra por `owner_user_id = request.userId` (ver `01-solucion-final.md` §3) — un único endpoint donde se olvide ese filtro sería una fuga de datos entre cuentas. Se verificó en vivo al implementarlo (dos cuentas no se ven entre sí), pero cualquier endpoint nuevo que se agregue tiene que respetar el mismo patrón.
- **`JWT_SECRET` es compartido entre todas las cuentas (HS256)**: si se filtra, quien lo tenga puede forjar un token válido para *cualquier* `user_id` — es un secreto de infraestructura (variable de entorno del servidor), nunca expuesto a los usuarios finales.
- **Tokens de 30 días sin revocación**: si un token se filtra, queda utilizable hasta que expira — cambiar la contraseña no lo invalida (no hay ese chequeo implementado). Es una decisión deliberada de simplicidad (sin refresh tokens ni tabla de sesiones activas), documentada como algo a revisar si el proyecto crece.
- **Sin límite de intentos de login**: no hay rate limiting en `/auth/login` — en teoría permite fuerza bruta contra una contraseña débil. Mitigado parcialmente por scrypt (cada intento es costoso de verificar), pero no es una defensa real contra un ataque dirigido.

### Imágenes de producto (conjuntos por proporción)
- **La validación de proporción confía en el `Content-Type`/contenido que devuelva la URL en el momento de cargarla, no lo vuelve a chequear después.** Si más adelante esa URL empieza a servir una imagen distinta (el hosting externo la reemplaza), la API no se entera — no hay una revalidación periódica como sí existe para los links de afiliados (ver `06-verificacion-de-disponibilidad.md`).
- **Los 500px mínimos y el 3% de tolerancia son valores elegidos por criterio, no medidos contra un caso real de las apps consumidoras** — si `training-app`/`despertador-app` necesitan otra cosa, hay que ajustar `apps/api/src/media/imageValidation.ts` a mano, no es configurable todavía.
- **Solo se lee el header del archivo (128KB) para medir dimensiones** — más rápido y liviano que descargar la imagen entera, pero un servidor que no soporte `Range` y sirva un archivo enorme antes de completar esos 128KB podría tardar más de lo esperado (mitigado parcialmente con un límite de 20MB por `Content-Length`, que no cubre servidores que no lo informan).
- **Sin reordenar ni editar una imagen ya cargada** — solo alta y baja, ver `01-solucion-final.md` §2.3.

### Documentación (SEO/GEO/LLMO)
- **GEO y LLMO son prácticas emergentes, no estándares con reglas fijas ni garantía de resultado.** A diferencia del SEO tradicional (con señales conocidas y medibles), no hay garantía de que un motor generativo cite o un agente de IA priorice esta documentación por seguir estas convenciones — son buenas prácticas razonables hoy (`llms.txt`, contenido autocontenido y citable, OpenAPI accesible), pero el criterio de estos sistemas puede cambiar sin aviso.
- El OpenAPI spec y la colección de Postman **valen por sí mismos independientemente de si el SEO/GEO "funciona"** — son el artefacto que efectivamente usa un desarrollador o un agente para integrar la API, con o sin indexación externa de por medio.

### Generales
- **Falsos positivos en la detección de "no disponible"**: una caída temporal de la plataforma o un error transitorio de red no debe tirar abajo un `Slot` válido. Hace falta un umbral de fallos consecutivos antes de marcarlo `broken` (contemplado en el diseño, pero es un punto de cuidado en la implementación).
- **El redirect no valida en tiempo real**: `GET /r/{product_id}/{dominio}` confía en el último estado calculado por el job periódico, no verifica el link en el momento del click (por velocidad y para no generar tráfico extra hacia Amazon/ML por cada click real). Esto significa que puede haber una ventana de hasta el intervalo del job (12–24h) donde un link recién roto todavía se sirva como si estuviera activo.
- **Single point of failure**: al mover el click-through a un dominio propio (el servicio `/r/...`, no confundir con el `dominio` de Amazon/ML), ese servicio se vuelve crítico para la monetización de *todas* tus apps a la vez. Downtime del servicio de redirección = todos los botones de compra rotos simultáneamente, aunque los links originales estén perfectos. Requiere monitoreo básico de uptime propio.
- **Escala deliberadamente chica**: el stack está pensado para "varias apps personales con tráfico bajo/medio, un solo entorno", no para volumen de e-commerce serio ni multi-tenancy a gran escala. El modelo de datos aguanta crecer, pero SQLite embebido + cron por GitHub Actions dejarían de ser suficientes si el proyecto escalara mucho (múltiples usuarios concurrentes escribiendo, o necesidad de checks casi en tiempo real).
