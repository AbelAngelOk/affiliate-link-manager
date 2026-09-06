import { NextResponse, type NextRequest } from "next/server";

// Protege el portal de administración salvo /login, el endpoint de sesión,
// el sitio de docs público y la home de marketing. La home es un caso
// especial: no puede matchear por prefijo ("/") porque eso haría público
// todo el sitio — se compara exacta.
//
// Las tres áreas (marketing, docs, admin) son entidades separadas para quien
// las usa aunque compartan el mismo Next.js — cada una vive bajo su propio
// layout (ver app/layout.tsx, app/docs, app/(admin)) y acá se refleja esa
// separación en términos de qué requiere sesión y qué no.
const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/session",
  "/api/forgot-password",
  "/api/reset-password",
  "/docs",
  "/sitemap.xml",
  "/robots.txt",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("access_token")?.value);
  const isPublicPath = pathname === "/" || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!hasSession && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
