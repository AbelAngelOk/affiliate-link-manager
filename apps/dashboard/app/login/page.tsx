"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Entidad separada del resto del sitio (ver app/layout.tsx): solo el modal
// de login sobre fondo blanco, sin nav ni chrome — es la puerta de entrada
// al portal de administración, no una página más del dashboard.
export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });

    setLoading(false);
    if (!res.ok) {
      setError("API key inválida.");
      return;
    }

    router.push("/productos");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm rounded-xl border p-6 shadow-lg">
        <h1 className="mb-1 text-lg font-semibold">Portal de administración</h1>
        <p className="mb-5 text-sm text-muted-foreground">Ingresá tu API key para continuar.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="apiKey">API key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="dev-secret-123"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </div>
    </div>
  );
}
