import { NextResponse, type NextRequest } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

// POST valida la key contra la API real (no confía en la que mande el
// formulario a ciegas) antes de guardarla en una cookie httpOnly.
export async function POST(request: NextRequest) {
  const { apiKey } = (await request.json()) as { apiKey?: string };
  if (!apiKey) {
    return NextResponse.json({ error: "Falta la API key" }, { status: 400 });
  }

  const check = await fetch(`${API_BASE_URL}/admin/apps`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!check.ok) {
    return NextResponse.json({ error: "API key inválida" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("api_key", apiKey, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("api_key");
  return response;
}
