import "server-only";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// El dashboard es un cliente más de la API (ver 03-stack-tecnologico.md §3.6):
// nunca toca SQLite directo. Solo corre server-side (import "server-only")
// para que el access token guardado en la cookie httpOnly nunca llegue al
// browser.
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const store = await cookies();
  const accessToken = store.get("access_token")?.value;
  if (!accessToken) throw new ApiError(401, "No hay sesión activa.");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `La API respondió ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
