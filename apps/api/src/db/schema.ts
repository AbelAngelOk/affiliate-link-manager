import { sqliteTable, text, integer, primaryKey, unique } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
};

// Fila única en v1 (single-tenant). El modelo ya soporta más filas para
// cuando se migre a OAuth multi-tenant (ver 01-solucion-final.md §3).
export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull(),
  oauthSubject: text("oauth_subject"),
  ...timestamps,
});

export const apps = sqliteTable("apps", {
  id: id(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  nombre: text("nombre").notNull(),
  bundleId: text("bundle_id").notNull(),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

// Límites de longitud documentados en 01-solucion-final.md §2.1.
// Se enforcean en la capa de validación de escritura (Etapa 5, zod),
// no como CHECK de SQLite, para poder dar mensajes de error claros.
export const products = sqliteTable("products", {
  id: id(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  titulo: text("titulo").notNull(), // máx 80
  descripcionCorta: text("descripcion_corta").notNull(), // máx 160
  descripcionLarga: text("descripcion_larga"), // máx 500, opcional
  imagenUrl: text("imagen_url").notNull(),
  imagenAlt: text("imagen_alt"), // máx 125, opcional
  categoria: text("categoria").notNull(), // máx 40
  ...timestamps,
});

// N:N producto <-> app
export const productApps = sqliteTable(
  "product_apps",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.productId, t.appId] }) }),
);

// Slot = producto + proveedor + país (ver 01-solucion-final.md §2)
export const slots = sqliteTable(
  "slots",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["amazon", "mercadolibre"] }).notNull(),
    country: text("country").notNull(),
    // Optimista: un slot nuevo arranca "active" (el admin acaba de cargar un
    // link que presumiblemente probó a mano) y el verificador (Etapa 7) lo
    // pasa a "unavailable" si más adelante deja de funcionar.
    status: text("status", { enum: ["active", "unavailable", "checking"] })
      .notNull()
      .default("active"),
    ...timestamps,
  },
  (t) => ({ productProviderCountry: unique().on(t.productId, t.provider, t.country) }),
);

// Cola ordenada de links candidatos dentro de un slot.
export const slotLinks = sqliteTable("slot_links", {
  id: id(),
  slotId: text("slot_id")
    .notNull()
    .references(() => slots.id, { onDelete: "cascade" }),
  affiliateUrl: text("affiliate_url").notNull(),
  priority: integer("priority").notNull().default(0), // menor número = mayor prioridad
  status: text("status", { enum: ["active", "broken"] }).notNull().default("active"),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
  lastOkAt: integer("last_ok_at", { mode: "timestamp" }),
  ...timestamps,
});

export const checkLogs = sqliteTable("check_logs", {
  id: id(),
  slotLinkId: text("slot_link_id")
    .notNull()
    .references(() => slotLinks.id, { onDelete: "cascade" }),
  checkedAt: integer("checked_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  resultado: text("resultado", { enum: ["ok", "fail"] }).notNull(),
  detalle: text("detalle"),
});
