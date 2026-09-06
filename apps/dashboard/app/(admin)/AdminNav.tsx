"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/productos", label: "Productos" },
  { href: "/apps", label: "Apps" },
  { href: "/slots", label: "Slots" },
  { href: "/tipos", label: "Tipos de producto" },
  { href: "/api-keys", label: "API Keys" },
  { href: "/cuenta", label: "Mi cuenta" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 px-2">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white",
              active && "bg-neutral-800 font-medium text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
