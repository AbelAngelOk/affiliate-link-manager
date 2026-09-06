import { imageSize } from "image-size";

export type AspectRatioKey = "1:1" | "2:3" | "4:5";

export const ASPECT_RATIO_KEYS: AspectRatioKey[] = ["1:1", "2:3", "4:5"];

// Ancho mínimo pensado para que se vea bien en una tarjeta de producto sin
// pixelarse; el alto sale solo de la proporción (ej. 4:5 con 500 de ancho
// exige 625 de alto). Mismo mínimo para los tres conjuntos — no hay un caso
// real todavía que pida distinto por conjunto.
const ASPECT_RATIOS: Record<AspectRatioKey, { ratio: number; minWidth: number }> = {
  "1:1": { ratio: 1, minWidth: 500 },
  "2:3": { ratio: 2 / 3, minWidth: 500 },
  "4:5": { ratio: 4 / 5, minWidth: 500 },
};

// Tolerancia sobre la proporción exacta: casi ninguna imagen real tiene el
// pixel perfecto (ej. 1000x1001), así que un margen chico evita rechazar
// imágenes válidas por redondeo de quien las generó.
const RATIO_TOLERANCE = 0.03;

// Alcanza para leer el header de cualquier formato común (PNG/JPEG/WebP/GIF)
// sin descargar la imagen entera — más rápido, y evita cargar en memoria un
// archivo gigante si alguien pone una URL rara a propósito.
const HEADER_BYTES = 128 * 1024;
const MAX_CONTENT_LENGTH = 20 * 1024 * 1024;

export class ImageValidationError extends Error {}

export async function validateImageAspectRatio(url: string, aspectRatio: AspectRatioKey): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Range: `bytes=0-${HEADER_BYTES - 1}` } });
  } catch (err) {
    throw new ImageValidationError(
      `No se pudo descargar la imagen: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    throw new ImageValidationError(`No se pudo descargar la imagen (HTTP ${res.status}).`);
  }

  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_CONTENT_LENGTH) {
    throw new ImageValidationError("La imagen pesa demasiado (máximo 20MB).");
  }

  const buffer = new Uint8Array(await res.arrayBuffer());

  let width: number, height: number;
  try {
    ({ width, height } = imageSize(buffer));
  } catch {
    throw new ImageValidationError(
      "No se pudieron leer las dimensiones de la imagen — ¿es una URL de imagen válida (PNG/JPEG/WebP/GIF)?",
    );
  }

  const target = ASPECT_RATIOS[aspectRatio];
  const actualRatio = width / height;
  const deviation = Math.abs(actualRatio - target.ratio) / target.ratio;

  if (deviation > RATIO_TOLERANCE) {
    throw new ImageValidationError(
      `La imagen es ${width}x${height} — no coincide con la proporción ${aspectRatio} (tolerancia ${RATIO_TOLERANCE * 100}%).`,
    );
  }
  if (width < target.minWidth) {
    throw new ImageValidationError(
      `La imagen es ${width}x${height}, demasiado chica — mínimo ${target.minWidth}px de ancho para ${aspectRatio}.`,
    );
  }
}
