"use client";

import { useRouter } from "next/navigation";

// Pensado para vivir en el sidebar oscuro del admin (ver app/(admin)/layout.tsx)
// — por eso el estilo replica el de los links del nav en vez de usar el
// componente Button de shadcn (pensado para fondos claros).
export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="block w-full rounded px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
      onClick={async () => {
        await fetch("/api/session", { method: "DELETE" });
        router.push("/login");
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
