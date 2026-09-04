"use client";

import { DataTable } from "@/components/data-table";
import { getSlotColumns, type Slot } from "./columns";

// Wrapper cliente: `getSlotColumns` vive en un módulo "use client" (usa
// SlotRowActions, que a su vez abre diálogos), así que no se puede invocar
// directo desde el Server Component de la página — ver nota en columns.tsx.
export function SlotsTable({ productId, slots }: { productId: string; slots: Slot[] }) {
  return (
    <DataTable
      columns={getSlotColumns(productId)}
      data={slots}
      emptyMessage="Este producto todavía no tiene ningún slot."
    />
  );
}
