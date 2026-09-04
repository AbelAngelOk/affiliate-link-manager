"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { sortableHeader } from "@/components/data-table";
import { SlotRowActions } from "./SlotRowActions";

export type Slot = {
  id: string;
  dominio: string;
  affiliateUrl: string;
  priority: number;
  status: "active" | "broken";
};

// El tablero global (GlobalSlotsTable) trae además el producto de cada fila
// — no hace falta en la vista de detalle de un producto puntual, donde ya
// está implícito por contexto.
export type GlobalSlot = Slot & { productId: string; productTitulo: string };

function statusCell(status: Slot["status"]) {
  return <Badge variant={status === "active" ? "default" : "destructive"}>{status}</Badge>;
}

function linkCell(url: string) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block max-w-56 truncate text-primary hover:underline">
      {url}
    </a>
  );
}

// Cada fila es directamente un slot = un link con su prioridad. Varias filas
// pueden compartir el mismo dominio: son la cola de fallback de ese canal.
// `productId` no es un atributo del slot — hace falta para las acciones
// (editar/borrar pegan a endpoints que necesitan saber a qué producto
// pertenece para revalidar la página correcta), así que las columnas se
// arman como función en vez de array fijo.
export function getSlotColumns(productId: string): ColumnDef<Slot>[] {
  return [
    { accessorKey: "dominio", header: sortableHeader("Dominio") },
    { accessorKey: "priority", header: sortableHeader("Prioridad") },
    {
      accessorKey: "status",
      header: sortableHeader("Estado"),
      cell: ({ row }) => statusCell(row.original.status),
    },
    {
      accessorKey: "affiliateUrl",
      header: "Link",
      cell: ({ row }) => linkCell(row.original.affiliateUrl),
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => <SlotRowActions productId={productId} slot={row.original} />,
    },
  ];
}

// Tablero global (sección "Slots" del admin): todos los slots del usuario,
// aclarando a qué producto pertenece cada uno — a diferencia de
// getSlotColumns, acá el productId viene por fila, no fijo por página.
export function getGlobalSlotColumns(): ColumnDef<GlobalSlot>[] {
  return [
    {
      accessorKey: "productTitulo",
      header: sortableHeader("Producto"),
      cell: ({ row }) => (
        <Link href={`/productos/${row.original.productId}`} className="text-primary hover:underline">
          {row.original.productTitulo}
        </Link>
      ),
    },
    { accessorKey: "dominio", header: sortableHeader("Dominio") },
    { accessorKey: "priority", header: sortableHeader("Prioridad") },
    {
      accessorKey: "status",
      header: sortableHeader("Estado"),
      cell: ({ row }) => statusCell(row.original.status),
    },
    {
      accessorKey: "affiliateUrl",
      header: "Link",
      cell: ({ row }) => linkCell(row.original.affiliateUrl),
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => <SlotRowActions productId={row.original.productId} slot={row.original} />,
    },
  ];
}
