import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

// useSearchParams (para leer ?token=) exige un límite de Suspense en el App
// Router — si no, Next falla el build de esta página.
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm rounded-xl border p-6 shadow-lg">
        <h1 className="mb-1 text-lg font-semibold">Elegir contraseña nueva</h1>
        <p className="mb-5 text-sm text-muted-foreground">El link vence a la hora de haberlo pedido.</p>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
