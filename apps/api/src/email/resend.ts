import { Resend } from "resend";
import { config } from "../config.js";

// Sin RESEND_API_KEY/RESEND_FROM_EMAIL configurados, degrada a loguear el
// link en consola en vez de mandar el email real — mismo criterio que
// notifications/telegram.ts, para poder deployar el flujo de "olvidé mi
// contraseña" antes de tener la cuenta de Resend lista.
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!config.resend) {
    console.warn(`[email] (Resend no configurado) Link de recuperación para ${to}: ${resetUrl}`);
    return;
  }

  const resend = new Resend(config.resend.apiKey);
  const { error } = await resend.emails.send({
    from: config.resend.fromEmail,
    to,
    subject: "Recuperar tu contraseña",
    html: `<p>Pedimos un cambio de contraseña para tu cuenta.</p><p><a href="${resetUrl}">Hacé click acá para elegir una nueva</a> (vence en 1 hora).</p><p>Si no fuiste vos, ignorá este email.</p>`,
  });

  if (error) {
    console.error("[email] Falló el envío con Resend:", error);
  }
}
