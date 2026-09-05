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
// login sirve tanto para el dashboard (el JWT se guarda en una cookie
// httpOnly) como para llamar a la API directo (el mismo JWT como Bearer
// token) — un solo registro para las dos formas de usar el sistema.
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
  apps: text("apps", { mode: "json" }).notNull().$type<string[]>().default([]),
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
