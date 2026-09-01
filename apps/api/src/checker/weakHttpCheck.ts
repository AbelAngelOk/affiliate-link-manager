import type { CheckResult } from "./mercadolibre.js";

// Chequeo débil: solo mira el status HTTP final tras seguir redirects. Es la
// única señal disponible para Amazon mientras la cuenta no tenga acceso a la
// Creators API (ver 04-alcance-y-limitaciones.md — problema de arranque de
// 10 ventas/30 días), y el fallback para links de Mercado Libre de los que
// no se pudo extraer un item_id. Nunca se trata como fuente de verdad.
export async function weakHttpCheck(url: string): Promise<CheckResult> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    if (res.status >= 400) {
      return { ok: false, detalle: `chequeo débil: HTTP ${res.status}` };
    }
    return { ok: true, detalle: `chequeo débil: HTTP ${res.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, detalle: `chequeo débil: error de red (${message})` };
  }
}
