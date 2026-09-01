"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      className="btn"
      style={{ background: "transparent", color: "#1a1a1a", border: "1px solid #ccc" }}
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
