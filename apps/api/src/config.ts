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
  // Firma los JWT que emiten POST /auth/register y /auth/login (ver
  // 01-solucion-final.md §3) — el usuario se autentica con email+contraseña,
  // no con una key estática.
  jwtSecret: required("JWT_SECRET"),
  // Credencial separada, no ligada a ningún usuario: solo gatea
  // POST /internal/check (el cron de GitHub Actions), que no es un login
  // humano y no tiene sentido detrás de email+contraseña.
  internalKey: required("INTERNAL_KEY"),
  databasePath: process.env.DATABASE_PATH ?? "./data/dev.db",
  // Opcional: sin esto, las notificaciones de Etapa 8 solo loguean en
  // consola en vez de mandar el mensaje real a Telegram.
  telegram:
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
      ? { botToken: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID }
      : null,
  // Opcional: sin esto, el link de "olvidé mi contraseña" se loguea en
  // consola en vez de mandarse por email de verdad (ver email/resend.ts) —
  // mismo criterio que Telegram arriba, para poder deployar esto antes de
  // tener la cuenta de Resend lista.
  resend:
    process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
      ? { apiKey: process.env.RESEND_API_KEY, fromEmail: process.env.RESEND_FROM_EMAIL }
      : null,
  // Base del dashboard, para armar el link de "olvidé mi contraseña"
  // (ej. https://tu-dashboard.vercel.app/reset-password?token=...).
  dashboardUrl: process.env.DASHBOARD_URL ?? "http://localhost:3001",
};
