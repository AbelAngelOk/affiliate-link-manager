import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { checkLogs, slots } from "../db/schema.js";
import { checkMercadoLibreItem, extractMercadoLibreItemId, type CheckResult } from "./mercadolibre.js";
import { weakHttpCheck } from "./weakHttpCheck.js";
import { notifyDominioUnavailable } from "../notifications/telegram.js";
import { isActivePriorityTaken, nextPriorityFor } from "../db/priority.js";

// Cuántos fallos seguidos hacen falta antes de marcar un slot "broken".
// Evita que una caída puntual de Amazon/ML tire abajo un link válido (ver
// 04-alcance-y-limitaciones.md, "Falsos positivos"). Aplica igual a las
// corridas manuales (Etapa 12) que a la periódica — un solo click no alcanza
// para romper un slot, es la misma garantía en los dos casos.
const FAILURE_THRESHOLD = 2;

function isMercadoLibre(dominio: string): boolean {
  return dominio.includes("mercadolibre");
}

async function checkOne(slot: typeof slots.$inferSelect): Promise<CheckResult> {
  if (isMercadoLibre(slot.dominio)) {
    const itemId = extractMercadoLibreItemId(slot.affiliateUrl);
    if (itemId) return checkMercadoLibreItem(itemId);
  }
  // Amazon siempre, y Mercado Libre cuando no se pudo extraer el item_id.
  return weakHttpCheck(slot.affiliateUrl);
}

async function hasReachedFailureThreshold(slotId: string): Promise<boolean> {
  const recent = await db
    .select({ resultado: checkLogs.resultado })
    .from(checkLogs)
    .where(eq(checkLogs.slotId, slotId))
    .orderBy(desc(checkLogs.checkedAt))
    .limit(FAILURE_THRESHOLD);

  return recent.length === FAILURE_THRESHOLD && recent.every((r) => r.resultado === "fail");
}

// Devuelve true si, tras el cambio, ya no queda ningún slot activo para ese
// product_id + dominio (el "canal" completo se quedó sin candidatos vivos).
async function dominioQuedoSinCandidatos(productId: string, dominio: string): Promise<boolean> {
  const [stillActive] = await db
    .select({ id: slots.id })
    .from(slots)
    .where(and(eq(slots.productId, productId), eq(slots.dominio, dominio), eq(slots.status, "active")))
    .limit(1);
  return !stillActive;
}

export type RunCheckSummary = {
  checked: number;
  markedBroken: string[];
  markedActiveAgain: string[];
  dominiosNowUnavailable: Array<{ productId: string; dominio: string }>;
};

function emptySummary(): RunCheckSummary {
  return { checked: 0, markedBroken: [], markedActiveAgain: [], dominiosNowUnavailable: [] };
}

// Corre el chequeo sobre un conjunto puntual de slots ya resuelto por quien
// llama (un solo slot, los de un producto, los de una app, o todos) y aplica
// siempre la misma lógica: umbral de fallos antes de romper, auto-reparación
// con reasignación de prioridad si hace falta, y notificación cuando un
// dominio se queda sin candidatos. Es el núcleo reusado tanto por la corrida
// periódica (runCheck, todos los slots) como por las acciones manuales del
// panel (routes/admin/check.ts) — misma garantía en los dos casos, ver
// 06-verificacion-de-disponibilidad.md.
export async function checkSlots(slotRows: Array<typeof slots.$inferSelect>): Promise<RunCheckSummary> {
  const summary = emptySummary();

  for (const slot of slotRows) {
    summary.checked += 1;
    let result: CheckResult;
    try {
      result = await checkOne(slot);
    } catch (err) {
      result = { ok: false, detalle: `error inesperado: ${err instanceof Error ? err.message : String(err)}` };
    }

    await db.insert(checkLogs).values({
      slotId: slot.id,
      resultado: result.ok ? "ok" : "fail",
      detalle: result.detalle,
    });

    if (result.ok) {
      if (slot.status === "broken") {
        // Mientras este slot estaba roto, su prioridad quedó libre para que
        // otro candidato la ocupara (ver 01-solucion-final.md §2.2 y
        // db/priority.ts) — si eso pasó, al reactivarse no puede reclamar el
        // mismo número: se reasigna al final de la cola en vez de romper el
        // índice único parcial.
        let priority = slot.priority;
        if (await isActivePriorityTaken(slot.productId, slot.dominio, priority, slot.id)) {
          priority = await nextPriorityFor(slot.productId, slot.dominio);
        }
        await db
          .update(slots)
          .set({ status: "active", priority, lastCheckedAt: new Date(), lastOkAt: new Date() })
          .where(eq(slots.id, slot.id));
        summary.markedActiveAgain.push(slot.id);
      } else {
        await db.update(slots).set({ lastCheckedAt: new Date(), lastOkAt: new Date() }).where(eq(slots.id, slot.id));
      }
      continue;
    }

    await db.update(slots).set({ lastCheckedAt: new Date() }).where(eq(slots.id, slot.id));

    if (slot.status === "active" && (await hasReachedFailureThreshold(slot.id))) {
      await db.update(slots).set({ status: "broken" }).where(eq(slots.id, slot.id));
      summary.markedBroken.push(slot.id);

      if (await dominioQuedoSinCandidatos(slot.productId, slot.dominio)) {
        summary.dominiosNowUnavailable.push({ productId: slot.productId, dominio: slot.dominio });
        await notifyDominioUnavailable(slot.productId, slot.dominio);
      }
    }
  }

  return summary;
}

// Corrida periódica completa (Etapa 7 / cron): todos los slots, activos y
// rotos. Wrapper fino sobre checkSlots() — la lógica real vive ahí.
export async function runCheck(): Promise<RunCheckSummary> {
  const allSlots = await db.select().from(slots);
  return checkSlots(allSlots);
}
