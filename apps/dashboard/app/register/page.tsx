"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Mismo tratamiento que /login (ver app/layout.tsx): entidad separada, solo
// el formulario sobre fondo blanco. El registro te loguea directo — no hay
// paso de confirmación de email en esta versión.
export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, mode: "register" }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "No se pudo crear la cuenta.");
      return;
    }

    router.push("/productos");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm rounded-xl border p-6 shadow-lg">
        <h1 className="mb-1 text-lg font-semibold">Crear cuenta</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          El mismo login sirve para el portal y para usar la API directo.
        </p>

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
          <div className="space-y-1">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
