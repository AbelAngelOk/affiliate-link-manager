import type { ReactNode } from "react";
import "./globals.css";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata = {
  title: "Links Referidos — Dashboard",
  description: "Administración de productos, slots y links de afiliados.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "12px 20px",
            borderBottom: "1px solid #ddd",
            background: "white",
          }}
        >
          <strong>Links Referidos</strong>
          <a href="/alertas">Alertas</a>
          <a href="/productos">Productos</a>
          <a href="/apps">Apps</a>
          <span style={{ marginLeft: "auto" }}>
            <LogoutButton />
          </span>
        </nav>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>{children}</div>
      </body>
    </html>
  );
}
