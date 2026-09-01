import { config } from "../config.js";

// Etapa 8: aviso cuando un slot se queda sin ningún SlotLink activo (ver
// 01-solucion-final.md §5). Sin TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID
// configurados, degrada a loguear en consola — no bloquea el checker si
// todavía no se armó el bot.
export async function notifySlotUnavailable(slotId: string): Promise<void> {
  const text = `⚠️ Slot sin links activos: ${slotId}\nHay que cargar un sustituto en el panel de administración.`;

  if (!config.telegram) {
    console.warn(`[notify] (Telegram no configurado) ${text}`);
    return;
  }

  const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: config.telegram.chatId, text }),
    });
    if (!res.ok) {
      console.error(`[notify] Telegram respondió ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("[notify] Fallo al enviar notificación a Telegram:", err);
  }
}
