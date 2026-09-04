import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "./client.js";
import { slots } from "./schema.js";

// Compartido entre routes/admin/slots.ts (alta/edición manual) y
// checker/runCheck.ts (auto-reparación) — ver 01-solucion-final.md §2 para
// las reglas de prioridad: única solo entre slots activos de un mismo
// producto+dominio, y nunca se reusa el número de un roto salvo que un
// slot nuevo lo pida explícitamente.

// Se calcula sobre TODAS las filas de ese producto+dominio (activas o
// rotas), no solo las activas — así un número de prioridad nunca se reusa
// para un link distinto al que lo tuvo antes (más fácil de leer en
// CheckLog más adelante). Que queden huecos no molesta: el redirect elige
// "la de menor prioridad que esté activa", no un número puntual.
export async function nextPriorityFor(productId: string, dominio: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${slots.priority})` })
    .from(slots)
    .where(and(eq(slots.productId, productId), eq(slots.dominio, dominio)));
  return (row?.max ?? -1) + 1;
}

// true si ya existe un slot ACTIVO con esa prioridad en ese producto+dominio
// (el índice único parcial solo mira activos, así que un slot roto en esa
// misma prioridad no cuenta como ocupado).
export async function isActivePriorityTaken(
  productId: string,
  dominio: string,
  priority: number,
  excludeSlotId?: string,
): Promise<boolean> {
  const conditions = [
    eq(slots.productId, productId),
    eq(slots.dominio, dominio),
    eq(slots.status, "active"),
    eq(slots.priority, priority),
  ];
  if (excludeSlotId) conditions.push(ne(slots.id, excludeSlotId));

  const [row] = await db.select({ id: slots.id }).from(slots).where(and(...conditions));
  return Boolean(row);
}

// Hace lugar para insertar/mover un slot a `priority` dentro de un
// producto+dominio: empuja +1 a los slots ACTIVOS con prioridad >= la
// solicitada, en orden descendente (el de más atrás primero) para no chocar
// nunca con el índice único parcial mientras se van corriendo. `excludeSlotId`
// es el propio slot que se está moviendo (en un PATCH), para no desplazarse
// a sí mismo.
export async function makeRoomForPriority(
  productId: string,
  dominio: string,
  priority: number,
  excludeSlotId?: string,
): Promise<void> {
  const conditions = [
    eq(slots.productId, productId),
    eq(slots.dominio, dominio),
    eq(slots.status, "active"),
    sql`${slots.priority} >= ${priority}`,
  ];
  if (excludeSlotId) conditions.push(ne(slots.id, excludeSlotId));

  const toShift = await db
    .select({ id: slots.id, priority: slots.priority })
    .from(slots)
    .where(and(...conditions))
    .orderBy(sql`${slots.priority} desc`);

  for (const row of toShift) {
    await db
      .update(slots)
      .set({ priority: row.priority + 1 })
      .where(eq(slots.id, row.id));
  }
}
