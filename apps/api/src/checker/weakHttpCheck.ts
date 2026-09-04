import type { CheckResult } from "./mercadolibre.js";

// User-Agent de navegador real: buena parte de los `403` observados en links
// de Mercado Libre de tipo `social/...?matt_word=...` parecen ser
// bot-detection reaccionando al User-Agent por defecto de `fetch()` (ver
// 06-verificacion-de-disponibilidad.md §5) — un producto activo puede dar
// falso "roto" solo por eso. No sirve contra el bloqueo de Amazon (ver abajo):
// ese es más sofisticado que un simple chequeo de header.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Confirmado en vivo durante el desarrollo (no es una lista adivinada): al
// pedir una URL de producto de Amazon con este checker, la respuesta con
// status 200 no era ni el producto ni una página de "no disponible" — era la
// pantalla de verificación anti-bot de Amazon (`/errors_page/validateCaptcha`,
// "Haz clic en el botón de abajo para continuar comprando"). El User-Agent de
// arriba no la evita: la detección de Amazon mira más que el header.
//
// Esto es un resultado DISTINTO de "el producto no existe": significa "no
// pudimos confirmar nada", no "está roto". Igual se devuelve `ok:false` (no
// hay forma de confirmar que el link sirve), pero con un detalle que lo deja
// explícito, para no leerlo como que el producto realmente se dio de baja.
const CAPTCHA_MARKERS = [
  "validatecaptcha",
  "continuar a compras",
  "haz clic en el botón de abajo para continuar",
  "enter the characters you see below",
  "type the characters you see in this image",
];

// Frases que indicarían "no disponible" de verdad (no bloqueo anti-bot) aunque
// el status HTTP sea 200. A diferencia de la lista de arriba, esta NO está
// verificada contra un caso real — ver 06-verificacion-de-disponibilidad.md §5:
// no se logró forzar una página de producto genuinamente dado de baja durante
// la investigación (los intentos con Amazon terminaron chocando con el
// captcha de arriba, no con esto). Queda como punto de partida a confirmar
// con el tiempo mirando el `detalle` en check_logs.
const UNAVAILABLE_MARKERS = [
  "currently unavailable",
  "we couldn't find that page",
  "no pudimos encontrar esa página",
  "actualmente no disponible",
  "página no encontrada",
  "page not found",
];

function findMarker(body: string, markers: string[]): string | null {
  const lower = body.toLowerCase();
  return markers.find((marker) => lower.includes(marker)) ?? null;
}

// Chequeo débil: nunca se trata como fuente de verdad (ver
// 06-verificacion-de-disponibilidad.md). Es la única señal disponible para
// Amazon mientras la cuenta no tenga acceso a la Creators API (ver
// 04-alcance-y-limitaciones.md — problema de arranque de 10 ventas/30 días),
// y el fallback para links de Mercado Libre de los que no se pudo extraer
// un item_id.
export async function weakHttpCheck(url: string): Promise<CheckResult> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": BROWSER_USER_AGENT },
    });

    if (res.status >= 400) {
      return { ok: false, detalle: `chequeo débil: HTTP ${res.status}` };
    }

    const body = await res.text();

    const captchaMarker = findMarker(body, CAPTCHA_MARKERS);
    if (captchaMarker) {
      return {
        ok: false,
        detalle: `chequeo débil: HTTP ${res.status}, bloqueado por verificación anti-bot ("${captchaMarker}") — no se pudo confirmar el producto, no implica que esté roto`,
      };
    }

    const unavailableMarker = findMarker(body, UNAVAILABLE_MARKERS);
    if (unavailableMarker) {
      return {
        ok: false,
        detalle: `chequeo débil: HTTP ${res.status}, el body contiene "${unavailableMarker}"`,
      };
    }

    return { ok: true, detalle: `chequeo débil: HTTP ${res.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, detalle: `chequeo débil: error de red (${message})` };
  }
}
