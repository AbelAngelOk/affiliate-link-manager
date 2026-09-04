"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { sortableHeader } from "@/components/data-table";
import { ProductRowActions } from "./ProductRowActions";

export type Product = {
  id: string;
  titulo: string;
  descripcionCorta: string;
  imagenUrl: string;
  categoria: string;
  apps: string[];
};

// Ítem "b" del pedido original: cada fila es un producto, cada columna un
// atributo, con una columna de acciones (ver/editar/borrar).
export const productColumns: ColumnDef<Product>[] = [
  {
    accessorKey: "titulo",
    header: sortableHeader("Título"),
  },
  {
    accessorKey: "categoria",
    header: sortableHeader("Categoría"),
  },
  {
    id: "apps",
    header: sortableHeader("Apps"),
    accessorFn: (row) => row.apps.join(", "),
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.apps.length === 0 ? (
          <span className="text-xs text-muted-foreground">sin asignar</span>
        ) : (
          row.original.apps.map((app) => (
            <Badge key={app} variant="secondary">
              {app}
            </Badge>
          ))
        )}
      </div>
    ),
  },
  {
    id: "acciones",
    header: "Acciones",
    cell: ({ row }) => <ProductRowActions product={row.original} />,
  },
];
