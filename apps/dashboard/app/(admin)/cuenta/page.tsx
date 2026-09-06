import { ChangePasswordForm } from "./ChangePasswordForm";

// "Olvidé mi contraseña" sigue sin resolver (ver 04-alcance-y-limitaciones.md
// y 05-plan-de-desarrollo.md): requiere un proveedor de envío de email, que
// no está en el stack todavía. Esto cubre el caso de cambiarla estando
// logueado.
export default function CuentaPage() {
  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Mi cuenta</h1>
        <p className="text-sm text-muted-foreground">Cambiar tu contraseña.</p>
      </div>
      <ChangePasswordForm />
    </main>
  );
}
