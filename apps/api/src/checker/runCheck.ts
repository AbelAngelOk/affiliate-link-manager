import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { checkLogs, slotLinks, slots } from "../db/schema.js";
import { checkMercadoLibreItem, extractMercadoLibreItemId, type CheckResult } from "./mercadolibre.js";
import { weakHttpCheck } from "./weakHttpCheck.js";
import { notifySlotUnavailable } from "../notifications/telegram.js";

// Cuántos fallos seguidos hacen falta antes de marcar un link "broken".
// Evita que una caída puntual de Amazon/ML tire abajo un link válido (ver
// 04-alcance-y-limitaciones.md, "Falsos positivos").
const FAILURE_THRESHOLD = 2;

async function checkOne(slotLink: typeof slotLinks.$inferSelect, provider: "amazon" | "mercadolibre") {
  if (provider === "mercadolibre") {
    const itemId = extractMercadoLibreItemId(slotLink.affiliateUrl);
    if (itemId) return checkMercadoLibreItem(itemId);
  }
  // Amazon siempre, y Mercado Libre cuando no se pudo extraer el item_id.
  return weakHttpCheck(slotLink.affiliateUrl);
}

async function hasReachedFailureThreshold(slotLinkId: string): Promise<boolean> {
  const recent = await db
    .select({ resultado: checkLogs.resultado })
    .from(checkLogs)
    .where(eq(checkLogs.slotLinkId, slotLinkId))
    .orderBy(desc(checkLogs.checkedAt))
    .limit(FAILURE_THRESHOLD);

  return recent.length === FAILURE_THRESHOLD && recent.every((r) => r.resultado === "fail");
}

export type RunCheckSummary = {
  checked: number;
  markedBroken: string[];
  markedActiveAgain: string[];
  slotsNowUnavailable: string[];
};

export async function runCheck(): Promise<RunCheckSummary> {
  const summary: RunCheckSummary = {
    checked: 0,
    markedBroken: [],
    markedActiveAgain: [],
    slotsNowUnavailable: [],
  };

  const activeLinks = await db
    .select({
      link: slotLinks,
      slotId: slots.id,
      provider: slots.provider,
    })
    .from(slotLinks)
    .innerJoin(slots, eq(slots.id, slotLinks.slotId))
    .where(eq(slotLinks.status, "active"));

  const affectedSlotIds = new Set<string>();

  for (const { link, slotId, provider } of activeLinks) {
    summary.checked += 1;
    let result: CheckResult;
    try {
      result = await checkOne(link, provider);
    } catch (err) {
      result = { ok: false, detalle: `error inesperado: ${err instanceof Error ? err.message : String(err)}` };
    }

    await db.insert(checkLogs).values({
      slotLinkId: link.id,
      resultado: result.ok ? "ok" : "fail",
      detalle: result.detalle,
    });

    if (result.ok) {
      await db
        .update(slotLinks)
        .set({ lastCheckedAt: new Date(), lastOkAt: new Date() })
        .where(eq(slotLinks.id, link.id));
      continue;
    }

    await db.update(slotLinks).set({ lastCheckedAt: new Date() }).where(eq(slotLinks.id, link.id));

    if (await hasReachedFailureThreshold(link.id)) {
      await db.update(slotLinks).set({ status: "broken" }).where(eq(slotLinks.id, link.id));
      summary.markedBroken.push(link.id);
      affectedSlotIds.add(slotId);
    }
  }

  // Un SlotLink "broken" puede volver solo a "active" si el checker lo
  // encuentra OK de nuevo (self-healing) — se revisa junto con los que
  // siguen rotos, para recalcular el status del slot una sola vez por corrida.
  const brokenLinks = await db.select().from(slotLinks).where(eq(slotLinks.status, "broken"));
  for (const link of brokenLinks) {
    const [slotOfLink] = await db
      .select({ slotId: slots.id, provider: slots.provider })
      .from(slots)
      .where(eq(slots.id, link.slotId));
    if (!slotOfLink) continue;

    const result = await checkOne(link, slotOfLink.provider).catch(
      (err): CheckResult => ({ ok: false, detalle: `error inesperado: ${err.message}` }),
    );
    await db.insert(checkLogs).values({
      slotLinkId: link.id,
      resultado: result.ok ? "ok" : "fail",
      detalle: result.detalle,
    });

    if (result.ok) {
      await db
        .update(slotLinks)
        .set({ status: "active", lastCheckedAt: new Date(), lastOkAt: new Date() })
        .where(eq(slotLinks.id, link.id));
      summary.markedActiveAgain.push(link.id);
      affectedSlotIds.add(slotOfLink.slotId);
    } else {
      await db.update(slotLinks).set({ lastCheckedAt: new Date() }).where(eq(slotLinks.id, link.id));
    }
  }

  // Recalcular el status de cada slot afectado según si le queda algún
  // SlotLink activo (ver 01-solucion-final.md §5).
  for (const slotId of affectedSlotIds) {
    const [stillActive] = await db
      .select({ id: slotLinks.id })
      .from(slotLinks)
      .where(and(eq(slotLinks.slotId, slotId), eq(slotLinks.status, "active")))
      .limit(1);

    const newStatus = stillActive ? "active" : "unavailable";
    const [slot] = await db.select().from(slots).where(eq(slots.id, slotId));
    if (!slot || slot.status === newStatus) continue;

    await db.update(slots).set({ status: newStatus }).where(eq(slots.id, slotId));

    if (newStatus === "unavailable") {
      summary.slotsNowUnavailable.push(slotId);
      await notifySlotUnavailable(slotId);
    }
  }

  return summary;
}
