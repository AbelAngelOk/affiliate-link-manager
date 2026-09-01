// Intenta extraer el item_id (ej. MLA123456789) de una URL de Mercado Libre.
// Funciona con links de producto directos (articulo.mercadolibre.com.ar/MLA-123...)
// pero NO con los links de afiliado tipo "social/usuario?matt_word=..." que
// genera el panel de afiliados (ver 02-gestion-links-afiliados.md) — esos son
// links de tracking que redirigen al producto, no contienen el ID en la URL.
// Si no se puede extraer, el checker cae al chequeo débil por HTTP (ver
// weakHttpCheck.ts), igual que con Amazon.
const ITEM_ID_PATTERN = /\b(ML[ABCV])-?(\d{5,})\b/i;

export function extractMercadoLibreItemId(url: string): string | null {
  const match = url.match(ITEM_ID_PATTERN);
  if (!match) return null;
  return `${match[1].toUpperCase()}${match[2]}`;
}

export type CheckResult = { ok: boolean; detalle: string };

export async function checkMercadoLibreItem(itemId: string): Promise<CheckResult> {
  const res = await fetch(`https://api.mercadolibre.com/items/${itemId}`);

  if (res.status === 404) {
    return { ok: false, detalle: `item ${itemId} no encontrado (404)` };
  }
  if (!res.ok) {
    return { ok: false, detalle: `API de Mercado Libre respondió ${res.status}` };
  }

  const data = (await res.json()) as { status?: string };
  if (data.status !== "active") {
    return { ok: false, detalle: `status de Mercado Libre = "${data.status}"` };
  }
  return { ok: true, detalle: "active" };
}
