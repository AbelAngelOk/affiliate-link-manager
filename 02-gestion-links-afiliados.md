# Cómo gestionan sus links de afiliados Amazon y Mercado Libre

## Amazon Associates

### Generación y estructura de links
- Los links se generan manualmente vía **SiteStripe** (barra de Amazon al navegar logueado como afiliado) o programáticamente vía **Product Advertising API (PA-API)**.
- Cada link lleva un `tag` de afiliado por marketplace (amazon.com, amazon.com.mx, amazon.es, etc.). Un mismo producto necesita un tag/link distinto por país si se apunta a distintos dominios de Amazon — Amazon ofrece **OneLink** para redirigir automáticamente al dominio del país del visitante manteniendo el tag correcto.
- **Amazon Associates solo tiene programa oficial en 20 países** (EE.UU., México, Brasil, España y varios más de Europa/Asia — lista completa en las fuentes). **Argentina no está entre ellos.** Esto es relevante para el modelo de este proyecto (doc 1, `Slot.country`): el campo `country` de un slot `provider=amazon` solo puede tomar valores de marketplaces donde Amazon realmente opera Associates (`mx`, `us`, `br`, `es`, etc.) — no existe (ni tiene sentido cargar) un slot `amazon:ar`. Quien esté en Argentina y quiera participar de Amazon Associates debe hacerlo a través del programa de EE.UU.

### La API está en transición (relevante para este proyecto)
- **PA-API 5.0 se deprecó el 30/04/2026 y se retira el 15/05/2026**, reemplazada por la **Creators API**.
- **La Creators API exige un mínimo de 10 ventas calificadas (shipped) en los últimos 30 días para mantener el acceso**. Si la cuenta cae por debajo de ese umbral, el acceso a la API se suspende (se restablece automáticamente al recuperar volumen).
- Cuentas nuevas arrancan con un límite bajo: ~1 request/segundo y 8.640 requests/día durante los primeros 30 días, y el límite escala según ventas calificadas generadas.
- **Implicación directa para este proyecto:** una cuenta de afiliado recién creada, sin historial de ventas, probablemente **no tendrá acceso a la API** para consultar disponibilidad/precio de forma automática. Hay que asumir un período inicial donde el chequeo de Amazon es manual o semi-automático (ver `04-alcance-y-limitaciones.md`).

### Reglas de cumplimiento (Operating Agreement)
- **Disclosure obligatorio**: la frase "As an Amazon Associate I earn from qualifying purchases" debe estar visible en el sitio/app, y cada link debe tener una indicación de que es un link pagado (ej. "(paid link)", "#ad") para cumplir FTC.
- **Anti-cloaking**: está prohibido ocultar u ofuscar que el destino es Amazon. Usar un dominio propio para redirigir (como se propone en este proyecto) **es válido siempre que sea transparente** — el usuario debe poder saber, antes o al hacer click, que va a Amazon (ej. botón con texto "Ver en Amazon"). No está permitido un link "genérico" tipo "click acá" que esconda el destino.
- **Precios cacheados**: si se muestra el precio de Amazon en la app, debe actualizarse **al menos cada 24 horas** y mostrar fecha/hora de la última actualización.
- Cada sitio/app donde se usan los links debe estar **declarado** en la cuenta de Associates.

## Mercado Libre — Programa de Afiliados y Creadores

### Generación de links
- El modelo es **manual y basado en panel web**: el afiliado entra al portal de Afiliados, busca un producto puntual (o una lista de afiliados) y genera el link desde ahí. **No existe una API pública oficial para generar links de afiliado de forma programática** — cualquier "API" de este tipo que circula es no oficial/no soportada.
- **Implicación directa:** en este proyecto, la *creación* del link de afiliado de ML siempre va a requerir un paso humano (entrar al panel, generar el link, pegarlo en el admin). Lo que sí se puede automatizar es la *validación* de que el producto sigue vivo (siguiente punto).
- Comisión de hasta 15% del valor del producto, acreditada directo en Mercado Pago.

### Restricciones de uso
- Solo se pueden compartir **links de producto individual o de listas de afiliados** — está prohibido linkear a home, categorías generales, carrito o resultados de búsqueda genéricos (bien alineado con el modelo de este proyecto, donde cada `SlotLink` es siempre un producto puntual).
- No se permite compartir en grupos privados o en canales/sitios no declarados ante Mercado Libre.
- Prohibido autocomprar a través del propio link.

### API pública de Mercado Libre (distinta del programa de afiliados)
- Mercado Libre sí tiene una **API de marketplace pública y documentada** (`api.mercadolibre.com`), separada del programa de afiliados, que permite consultar el detalle de cualquier ítem por su ID: `GET /items/{item_id}` (el ID, ej. `MLA123456789`, ya está contenido en cualquier link de producto/afiliado).
- Esa respuesta incluye `status` (`active`, `paused`, `closed`, `under_review`, etc.), precio y `available_quantity`/`sold_quantity` (estos dos últimos marcados como "referenciales", no 100% exactos).
- **Esta es la pieza clave de automatización disponible para este proyecto**: no se puede generar el link automáticamente, pero sí se puede validar automáticamente si el producto detrás de un link ya generado sigue activo, consultando este endpoint público con el `item_id` extraído del link guardado.
- Cada vez más operaciones de esta API piden autenticación por app (registrar una aplicación gratuita, OAuth), incluso para lecturas públicas — conviene registrar una app de ML desde el arranque del proyecto aunque el volumen sea bajo.

## Resumen comparativo

| | Amazon | Mercado Libre |
|---|---|---|
| Generación de link de afiliado | Manual (SiteStripe) o vía API (Creators API) | Manual únicamente (panel de afiliados) |
| API para validar disponibilidad | Sí, pero con barrera de entrada (10 ventas/30 días) | Sí, API pública general del marketplace, sin relación con el programa de afiliados |
| Multi-país | Requiere tag/link por dominio, o OneLink. **Solo 20 países tienen programa** (Argentina no incluida) | Cada país es un sitio de ML distinto (MLA, MLM, MLB…), IDs de producto no se comparten entre países. Sí incluye Argentina |
| Restricción de cloaking | Explícita: no ocultar que el destino es Amazon | No especificada igual de explícita, pero exige declarar el canal/sitio usado |
| Vigencia de precios mostrados | Máx. 24h sin refrescar + timestamp visible | No especificado como regla dura, pero recomendable aplicar el mismo criterio |

## Fuentes consultadas (Amazon Associates: países soportados)
- [Amazon Associates Countries List 2026 — Youfiliate](https://www.youfiliate.com/blog/amazon-associates-countries-list)
- [Amazon Affiliate Program Countries: The Complete 2026 List — Affilytics](https://blog.affilytics.io/blog/amazon-affiliate-program-countries/)

## Fuentes consultadas
- [Amazon.com Associates Central — Operating Agreement](https://affiliate-program.amazon.com/help/operating/agreement)
- [Amazon.com Associates Central — Policies](https://affiliate-program.amazon.com/help/operating/policies)
- [Amazon PA-API v5 deprecation / Creators API migration — dev.to](https://dev.to/th3nate/amazon-pa-api-v5-is-shutting-down-april-30-2026-here-is-what-changes-at-the-auth-layer-22ek)
- [How to get Amazon Creators API access in 2026 — Velantio](https://velantio.com/blog/how-to-get-amazon-creators-api-access)
- [Amazon PA-API deprecation / Creators API migration guide — FreshStore](https://blog.freshstore.com/amazon-creators-api-pa-api-retirement/)
- [Can I Cloak Amazon Links? — Lasso Help Center](https://support.getlasso.co/en/articles/3776391-can-i-cloak-amazon-links)
- [Link Cloaking & Amazon Compliance — Geniuslink](https://geniuslink.com/blog/link-cloaking-amazon/)
- [Mercado Libre lanzó su Programa de Afiliados y Creadores — Revista Mercado](https://mercado.com.ar/marketing/mercado-libre-lanzo-en-el-pais-su-programa-de-afiliados-y-creadores-con-comisiones-de-hasta-15/)
- [Buenas Prácticas para Compartir — Mercado Libre](https://www.mercadolibre.com.ar/l/primeros-pasos-buenas-practicas-links)
- [Preguntas Frecuentes Afiliados — Mercado Libre](https://www.mercadolibre.com.mx/l/preguntas-frecuentes-afiliados)
- [Items & Searches — Mercado Libre Developers](https://developers.mercadolibre.com.ar/en_us/items-and-searches)
- [Programa de afiliados do Mercado Livre não tem uma API — Reclame AQUI](https://www.reclameaqui.com.br/mercado-livre/programa-de-afiliados-do-mercado-livre-nao-tem-uma-api_-lfESpIamuDGm2ro/)
