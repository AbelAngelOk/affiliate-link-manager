"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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

    router.push("/alertas");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 320, margin: "60px auto" }}>
      <h1>Links Referidos</h1>
      <form onSubmit={handleSubmit}>
        <input
          className="field"
          type="password"
          placeholder="API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoFocus
        />
        <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
        {error && <p style={{ color: "#a12626" }}>{error}</p>}
      </form>
    </main>
  );
}
