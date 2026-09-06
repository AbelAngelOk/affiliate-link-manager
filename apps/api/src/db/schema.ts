import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
};

// Cuenta multi-tenant (ver 01-solucion-final.md §3): cualquiera se registra
// con email+contraseña (POST /auth/register) y pasa a ser dueño de sus
// propios products — no hay usuario "root" ni credencial especial. Ese mismo
// login le da acceso al dashboard (el JWT se guarda en una cookie httpOnly)
// y le permite generar sus propias read API keys (ver `readApiKeys` abajo)
// para que sus apps consuman `/v1/*` sin depender de ese JWT de sesión.
export const users = sqliteTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    // Hash scrypt, nunca texto plano (ver auth/password.ts).
    passwordHash: text("password_hash").notNull(),
    ...timestamps,
  },
  (t) => ({
    emailUnique: uniqueIndex("users_email_unique").on(t.email),
  }),
);

// Credencial de solo lectura para `/v1/*` (ver 01-solucion-final.md §3): a
// diferencia del JWT de sesión (30 días, pensado para un humano logueado en
// el dashboard), esto es para que una app integrada una vez siga funcionando
// indefinidamente sin volver a loguearse. Se genera desde el dashboard (ahí
// sí hace falta estar logueado — es "el proceso de elegir a qué cuenta
// pertenece"), no expira sola, y se revoca seteando `revokedAt` en vez de
// borrarla (así el historial de qué existió no se pierde). El valor en texto
// plano se muestra una única vez; acá solo se guarda su hash (ver
// auth/readKey.ts) — a diferencia de las contraseñas, es un hash simple
// (sin salt) porque la key ya nace con entropía alta y necesita poder
// buscarse por igualdad directa en la tabla (no hay otro campo por el que
// encontrar la fila antes de poder verificarla).
export const readApiKeys = sqliteTable(
  "read_api_keys",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    keyHash: text("key_hash").notNull(),
    name: text("name").notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => ({
    keyHashUnique: uniqueIndex("read_api_keys_key_hash_unique").on(t.keyHash),
  }),
);

// Token de un solo uso para "olvidé mi contraseña" (ver
// 04-alcance-y-limitaciones.md — era una limitación anotada). Mismo criterio
// de hash que `readApiKeys` (sha256 sin salt, alta entropía, búsqueda
// directa por igualdad). Vence a la hora (`expiresAt`) y se marca `usedAt`
// al canjearlo — un token usado no sirve dos veces aunque no haya expirado.
export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => ({
    tokenHashUnique: uniqueIndex("password_reset_tokens_token_hash_unique").on(t.tokenHash),
  }),
);

// Límites de longitud documentados en 01-solucion-final.md §2.1.
// Se enforcean en la capa de validación de escritura (Etapa 5, zod),
// no como CHECK de SQLite, para poder dar mensajes de error claros.
//
// No existe una entidad App separada: no hace falta más que el nombre de la
// app para identificarla, así que "apps" es directamente un atributo del
// producto (lista de nombres) en vez de una tabla + join N:N. Un producto
// puede seguir asociado a más de una app (es un array), solo que ya no hay
// ningún otro dato de la app (id propio, bundle_id, etc.) que justifique una
// tabla aparte.
// "Tipo de producto" (ej. "libro"): lo crea cada usuario desde el dashboard,
// no un desarrollador por código — es la diferencia clave con tener un
// schema fijo por tipo. Un producto puede o no tener un tipo asignado
// (`products.productTypeId`, nullable); si lo tiene, puede cargar valores
// para los campos que ese tipo definió (ver `productTypeFields` y
// `productFieldValues` más abajo). Título/descripción/etc. de `Product`
// siguen siendo genéricos y no dependen del tipo — los campos de tipo son
// siempre ADEMÁS de esos, nunca en reemplazo.
export const productTypes = sqliteTable("product_types", {
  id: id(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // ej. "libro" — máx 60, ver validación en la ruta
  ...timestamps,
});

// Un campo declarado por el usuario para un tipo (ej. "autor" en "libro").
// Texto plano únicamente (mismo criterio que los campos de Product, ver
// §2.1) — `fieldType` solo distingue una línea de varias, no hay campos
// numéricos/fecha/etc. todavía porque no hay un caso real que los pida.
export const productTypeFields = sqliteTable("product_type_fields", {
  id: id(),
  productTypeId: text("product_type_id")
    .notNull()
    .references(() => productTypes.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // ej. "autor" — máx 60
  fieldType: text("field_type", { enum: ["text", "textarea"] }).notNull().default("text"),
  required: integer("required", { mode: "boolean" }).notNull().default(false),
  position: integer("position").notNull().default(0), // orden de aparición en el formulario
  ...timestamps,
});

export const products = sqliteTable("products", {
  id: id(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  titulo: text("titulo").notNull(), // máx 80
  descripcionCorta: text("descripcion_corta").notNull(), // máx 160
  descripcionLarga: text("descripcion_larga"), // máx 500, opcional
  imagenUrl: text("imagen_url").notNull(), // imagen principal/portada — se mantiene por compatibilidad, ver `productImages` para el resto
  imagenAlt: text("imagen_alt"), // máx 125, opcional
  categoria: text("categoria").notNull(), // máx 40
  apps: text("apps", { mode: "json" }).notNull().$type<string[]>().default([]),
  // Opcional: un producto no necesita tener un tipo. Si el tipo se borra,
  // el producto no se borra con él — solo pierde la asignación (y con ella
  // sus valores de campo, ver productFieldValues abajo, que cascadean por
  // el campo, no por el producto).
  productTypeId: text("product_type_id").references(() => productTypes.id, { onDelete: "set null" }),
  ...timestamps,
});

// Valor de un campo de tipo para un producto puntual (ej. producto X, campo
// "autor" → "Robin Sharma"). Una fila por producto+campo — si el producto
// cambia de tipo o el campo se borra, sus valores viejos se van con el
// campo (`onDelete: cascade` en productTypeFieldId), no quedan huérfanos.
export const productFieldValues = sqliteTable(
  "product_field_values",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    productTypeFieldId: text("product_type_field_id")
      .notNull()
      .references(() => productTypeFields.id, { onDelete: "cascade" }),
    value: text("value").notNull().default(""),
    ...timestamps,
  },
  (t) => ({
    uniquePerField: uniqueIndex("product_field_values_product_field_unique").on(t.productId, t.productTypeFieldId),
  }),
);

// Imágenes adicionales de un producto, más allá de la portada (`imagenUrl`
// arriba, que no se toca para no romper el contrato ya consumido por las
// apps). Cada imagen pertenece a uno de tres conjuntos por proporción —
// 1:1 (miniaturas/tarjetas flexibles), 2:3 (portada tipo libro/poster) y 4:5
// (formato retrato genérico) — y un producto puede tener cero, una o varias
// imágenes en cada conjunto; los tres son opcionales. La proporción real del
// archivo se valida al cargarlo (ver media/imageValidation.ts) contra la
// declarada acá, no se confía en que quien carga la URL haya medido bien.
export const productImages = sqliteTable("product_images", {
  id: id(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  aspectRatio: text("aspect_ratio", { enum: ["1:1", "2:3", "4:5"] }).notNull(),
  url: text("url").notNull(),
  // Orden dentro del mismo product_id + aspect_ratio — mismo rol que
  // `priority` en `slots`, pero acá es solo orden de visualización, no
  // fallback (todas las imágenes de un conjunto son válidas a la vez).
  position: integer("position").notNull().default(0),
  ...timestamps,
});

// Slot = un único link candidato para un producto+dominio, con su prioridad.
// Fusiona lo que antes eran dos tablas (Slot = canal, SlotLink = cola de
// candidatos dentro del canal): ahora el "canal" (ej. amazon.com.mx) no es
// una fila propia, es el valor repetido de `dominio` entre varias filas de
// `slots` del mismo producto — la cola de fallback es, directamente, "todas
// las filas con el mismo product_id + dominio", ordenadas por priority.
//
// `dominio` reemplaza los campos separados `provider` + `country`: en la
// práctica cada canal ya es un dominio real (amazon.com.mx,
// mercadolibre.com.ar, etc.), así que unificarlos evita cargar dos atributos
// para expresar una sola cosa. El proveedor (para decidir qué estrategia de
// verificación usar, ver checker/runCheck.ts) se infiere del propio dominio
// en vez de guardarse aparte.
export const slots = sqliteTable(
  "slots",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    dominio: text("dominio").notNull(), // ej. "amazon.com.mx", "mercadolibre.com.ar"
    affiliateUrl: text("affiliate_url").notNull(),
    priority: integer("priority").notNull().default(0), // menor número = mayor prioridad dentro del mismo dominio
    // Optimista: un slot nuevo arranca "active" (el admin acaba de cargar un
    // link que presumiblemente probó a mano) y el verificador (Etapa 7) lo
    // pasa a "broken" si más adelante deja de funcionar.
    status: text("status", { enum: ["active", "broken"] }).notNull().default("active"),
    lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
    lastOkAt: integer("last_ok_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => ({
    // Único parcial: la prioridad solo tiene que ser irrepetible entre los
    // slots ACTIVOS de un mismo producto+dominio. Un slot roto no "reserva"
    // su número para siempre — un candidato nuevo puede reusarlo apenas el
    // roto deja de contar (ver 01-solucion-final.md §2, sección de prioridad).
    activeDominioPriority: uniqueIndex("slots_active_dominio_priority")
      .on(t.productId, t.dominio, t.priority)
      .where(sql`${t.status} = 'active'`),
  }),
);

export const checkLogs = sqliteTable("check_logs", {
  id: id(),
  slotId: text("slot_id")
    .notNull()
    .references(() => slots.id, { onDelete: "cascade" }),
  checkedAt: integer("checked_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  resultado: text("resultado", { enum: ["ok", "fail"] }).notNull(),
  detalle: text("detalle"),
});
