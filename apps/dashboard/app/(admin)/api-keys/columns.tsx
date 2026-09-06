"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { sortableHeader } from "@/components/data-table";
import { RevokeKeyButton } from "./RevokeKeyButton";

export type ApiKeyRow = {
  id: string;
  name: string;
  createdAt: string;
  revokedAt: string | null;
};

export const apiKeyColumns: ColumnDef<ApiKeyRow>[] = [
  { accessorKey: "name", header: sortableHeader("Nombre") },
  {
    accessorKey: "createdAt",
    header: sortableHeader("Creada"),
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    id: "status",
    header: "Estado",
    cell: ({ row }) =>
      row.original.revokedAt ? (
        <Badge variant="secondary">Revocada</Badge>
      ) : (
        <Badge className="bg-emerald-600 hover:bg-emerald-600">Activa</Badge>
      ),
  },
  {
    id: "acciones",
    header: "Acciones",
    cell: ({ row }) => (row.original.revokedAt ? null : <RevokeKeyButton id={row.original.id} />),
  },
];
