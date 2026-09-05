import { NextResponse, type NextRequest } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

type SessionBody = { email?: string; password?: string; mode?: "login" | "register" };

// POST habla con la API real (/auth/login o /auth/register, ver
// apps/api/src/routes/auth.ts) y guarda el access_token que devuelve en una
// cookie httpOnly — el mismo token que cualquier consumidor directo de la
// API obtendría llamando a esos endpoints, acá solo queda escondido del
// browser (ver lib/apiClient.ts).
export async function POST(request: NextRequest) {
  const { email, password, mode = "login" } = (await request.json()) as SessionBody;
  if (!email || !password) {
    return NextResponse.json({ error: "Falta email o contraseña" }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE_URL}/auth/${mode === "register" ? "register" : "login"}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!upstream.ok) {
    const body = (await upstream.json().catch(() => ({}))) as { error?: string };
    const message =
      body.error === "email_taken"
        ? "Ese email ya está registrado."
        : body.error === "invalid_credentials"
          ? "Email o contraseña incorrectos."
          : "No se pudo iniciar sesión.";
    return NextResponse.json({ error: message }, { status: upstream.status });
  }

  const { access_token: accessToken, expires_in: expiresIn } = (await upstream.json()) as {
    access_token: string;
    expires_in: number;
  };

  const response = NextResponse.json({ ok: true });
  response.cookies.set("access_token", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: expiresIn,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("access_token");
  return response;
}
