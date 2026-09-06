"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Mismo tratamiento que /login y /register: entidad separada, formulario
// centrado sobre fondo blanco. Siempre muestra el mismo mensaje de éxito,
// exista o no la cuenta (ver apps/api/src/routes/auth.ts) — no da pistas.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm rounded-xl border p-6 shadow-lg">
        <h1 className="mb-1 text-lg font-semibold">Recuperar contraseña</h1>

        {sent ? (
          <p className="text-sm text-muted-foreground">
            Si esa cuenta existe, te mandamos un email con un link para elegir una contraseña nueva.
          </p>
        ) : (
          <>
            <p className="mb-5 text-sm text-muted-foreground">Te mandamos un link para elegir una nueva.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Enviando..." : "Enviar link"}
              </Button>
            </form>
          </>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
