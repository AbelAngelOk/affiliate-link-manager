import { db } from "./client.js";
import { users } from "./schema.js";

// Crea el único usuario (single-tenant v1, ver 01-solucion-final.md §2) si
// todavía no existe ninguno. Idempotente a propósito: se puede correr de
// nuevo sin duplicar filas ni romper nada.
async function seedUser() {
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    console.log(`Ya existe un usuario (${existing[0].email}), no se crea otro.`);
    return;
  }

  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("Falta la variable de entorno ADMIN_EMAIL");

  const [user] = await db.insert(users).values({ email }).returning();
  console.log(`Usuario creado: ${user.id} (${user.email})`);
}

seedUser().catch((err) => {
  console.error(err);
  process.exit(1);
});
