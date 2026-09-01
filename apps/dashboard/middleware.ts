import { NextResponse, type NextRequest } from "next/server";

// Protege todo salvo /login, el endpoint de sesión y el sitio de docs
// público (Etapa 10 — SEO/GEO/LLMO: tiene que ser accesible sin login para
// que un buscador, un motor generativo o un agente lo pueda leer). La API
// key real nunca pasa por acá — solo se chequea que exista la cookie; la
// validación real contra la API pasa en app/api/session/route.ts al login.
const PUBLIC_PREFIXES = ["/login", "/api/session", "/docs", "/sitemap.xml", "/robots.txt"];

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("api_key")?.value);
  const isPublicPath = PUBLIC_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (!hasSession && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
