try {
  process.loadEnvFile();
} catch {
  // en producción las variables ya vienen seteadas por el entorno, no hay .env
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  apiKey: required("API_KEY"),
  databasePath: process.env.DATABASE_PATH ?? "./data/dev.db",
  // Opcional: sin esto, las notificaciones de Etapa 8 solo loguean en
  // consola en vez de mandar el mensaje real a Telegram.
  telegram:
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
      ? { botToken: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID }
      : null,
};
