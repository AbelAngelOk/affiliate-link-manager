"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { sortableHeader } from "@/components/data-table";
import { AppRowActions } from "./AppRowActions";

export type AppRow = {
  nombre: string;
  productos: { id: string; titulo: string }[];
};

// No hay entidad App en el backend (ver 01-solucion-final.md §2): esta vista
// es enteramente derivada de products.apps[], se arma en app/(admin)/apps/page.tsx
// a partir de GET /admin/products — por eso no tiene crear/editar/borrar
// (eso se hace editando el producto), pero sí "Validar": corre el chequeo
// sobre todos los slots de todos los productos de esa app de una sola vez.
export const appColumns: ColumnDef<AppRow>[] = [
  {
    accessorKey: "nombre",
    header: sortableHeader("Nombre"),
  },
  {
    id: "cantidad",
    header: sortableHeader("Productos"),
    accessorFn: (row) => row.productos.length,
  },
  {
    id: "productos",
    header: "Aparece en",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {row.original.productos.map((p) => (
          <Link key={p.id} href={`/productos/${p.id}`} className="text-sm text-primary hover:underline">
            {p.titulo}
          </Link>
        ))}
      </div>
    ),
  },
  {
    id: "acciones",
    header: "Acciones",
    cell: ({ row }) => <AppRowActions nombre={row.original.nombre} />,
  },
];
