"use client";

import { useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Encabezado de columna clickeable para ordenar asc/desc (ítem "c" del
// pedido: tableros con orden de mayor a menor por columna).
export function sortableHeader(label: string) {
  return function Header({
    column,
  }: {
    column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" };
  }) {
    const sorted = column.getIsSorted();
    return (
      <Button variant="ghost" size="sm" className="-ml-2.5" onClick={() => column.toggleSorting(sorted === "asc")}>
        {label}
        {sorted === "asc" ? (
          <ArrowUp className="ml-1 size-3.5" />
        ) : sorted === "desc" ? (
          <ArrowDown className="ml-1 size-3.5" />
        ) : (
          <ArrowUpDown className="ml-1 size-3.5 opacity-40" />
        )}
      </Button>
    );
  };
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage?: string;
}

// Tablero genérico reusado por /productos y /productos/[id] (slots) — ítems
// "b" y "c" del pedido. Client component porque el estado de orden vive del
// lado del navegador; los datos llegan ya resueltos desde el Server Component
// de la página (fetch server-side vía apiFetch).
export function DataTable<TData, TValue>({ columns, data, emptyMessage = "Sin resultados." }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
