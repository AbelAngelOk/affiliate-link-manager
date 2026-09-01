import { db } from "../db/client.js";
import { users } from "../db/schema.js";

// v1 es single-tenant (ver 01-solucion-final.md §3): la API key solo prueba
// que quien llama sos vos, no distingue "de quién" es cada request. Esta
// función es el único lugar que resuelve "el usuario actual", así que el día
// que se migre a OAuth multi-tenant, el cambio es reemplazar esta función por
// una que decodifique el JWT (`sub`) — el resto del código que la llama no
// cambia.
let cachedUserId: string | null = null;

export async function getCurrentUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  if (!user) {
    throw new Error(
      "No hay ningún usuario en la base. Correr `npm run db:seed` (o crear uno) antes de levantar la API.",
    );
  }

  cachedUserId = user.id;
  return cachedUserId;
}
