"use client";

import { DataTable } from "@/components/data-table";
import { getGlobalSlotColumns, type GlobalSlot } from "./columns";

// Wrapper cliente (mismo motivo que SlotsTable.tsx): getGlobalSlotColumns
// vive en un módulo "use client", no se puede invocar desde el Server
// Component de la página.
export function GlobalSlotsTable({ slots }: { slots: GlobalSlot[] }) {
  return (
    <DataTable columns={getGlobalSlotColumns()} data={slots} emptyMessage="Todavía no cargaste ningún slot." />
  );
}
