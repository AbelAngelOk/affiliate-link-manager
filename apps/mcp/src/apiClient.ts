// Envuelve la API real (ver 01-solucion-final.md) — este servidor MCP no
// tiene lógica propia de negocio, solo traduce herramientas en requests
// HTTP a /admin/* con el JWT de sesión. Mismas credenciales que el
// dashboard (email+contraseña), porque /admin/* no acepta una read API key
// (esas son solo para /v1/*, ver plugins/requireReadKey.ts en la API) — un
// MCP que administra productos/slots necesita la sesión, no la lectura.
const API_BASE_URL = process.env.LINKS_REFERIDOS_API_URL ?? "https://links-referidos-api.fly.dev";
const EMAIL = process.env.LINKS_REFERIDOS_EMAIL;
const PASSWORD = process.env.LINKS_REFERIDOS_PASSWORD;

let cachedToken: string | null = null;

async function login(): Promise<string> {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "Faltan las variables de entorno LINKS_REFERIDOS_EMAIL / LINKS_REFERIDOS_PASSWORD (la cuenta del dashboard).",
    );
  }

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`No se pudo iniciar sesión contra ${API_BASE_URL} (HTTP ${res.status}).`);
  }

  const { access_token: accessToken } = (await res.json()) as { access_token: string };
  cachedToken = accessToken;
  return accessToken;
}

// El JWT de sesión vence a los 30 días (ver auth/jwt.ts en la API) — un
// proceso MCP de larga vida eventualmente va a pegar un 401 y necesita
// volver a loguearse solo, sin que haya un humano mirando la terminal.
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = cachedToken ?? (await login());

  async function send(bearer: string) {
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${bearer}` },
    });
  }

  let res = await send(token);
  if (res.status === 401) {
    res = await send(await login());
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`La API respondió ${res.status}${body ? `: ${body}` : ""}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
