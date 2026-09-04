import type { ReactNode } from "react";
import { AdminNav } from "./AdminNav";
import { LogoutButton } from "@/components/LogoutButton";

// El portal de administración es su propia entidad (ver app/layout.tsx):
// menú vertical oscuro fijo + contenido a la derecha, sin nada del header
// de marketing ni del sidebar de docs. middleware.ts ya garantiza que acá
// solo se llega con sesión — este layout no vuelve a chequear eso.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-neutral-950 text-white">
        <div className="p-4">
          <p className="font-semibold">Links Referidos</p>
          <p className="text-xs text-neutral-400">Portal de administración</p>
        </div>

        <AdminNav />

        <div className="mt-auto space-y-1 border-t border-neutral-800 p-2">
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="block rounded px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
          >
            Documentación ↗
          </a>
          <LogoutButton />
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto bg-muted/20 p-6">{children}</div>
    </div>
  );
}
