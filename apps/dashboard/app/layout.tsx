import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Links Referidos API",
  description: "Gestión de productos y links de afiliados (Amazon/Mercado Libre) para múltiples apps.",
};

// Deliberadamente sin nav ni chrome acá: marketing (app/page.tsx), docs
// (app/docs) y el portal de administración (app/(admin)) tienen cada uno su
// propio layout — se leen como tres productos distintos, no como secciones
// de una misma app con un header compartido.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
