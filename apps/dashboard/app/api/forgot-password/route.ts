import { NextResponse, type NextRequest } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

// Simple proxy a la API real (ver apps/api/src/routes/auth.ts) — mismo
// patrón que /api/session, para no tener que habilitar CORS en la API
// solo para esto.
export async function POST(request: NextRequest) {
  const { email } = (await request.json()) as { email?: string };
  if (!email) return NextResponse.json({ error: "Falta el email" }, { status: 400 });

  await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  // Siempre ok, exista o no la cuenta (ver auth.ts) — no dar pistas.
  return NextResponse.json({ ok: true });
}
