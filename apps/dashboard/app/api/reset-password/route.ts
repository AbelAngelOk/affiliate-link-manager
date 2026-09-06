import { NextResponse, type NextRequest } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  const { token, password } = (await request.json()) as { token?: string; password?: string };
  if (!token || !password) {
    return NextResponse.json({ error: "Falta el token o la contraseña" }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: password }),
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: "El link no es válido o ya venció." }, { status: upstream.status });
  }

  return NextResponse.json({ ok: true });
}
