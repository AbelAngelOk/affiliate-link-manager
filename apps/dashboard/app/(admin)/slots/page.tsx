import { apiFetch } from "@/lib/apiClient";
import { GlobalSlotsTable } from "./GlobalSlotsTable";
import type { GlobalSlot } from "./columns";

export default async function SlotsPage() {
  const slots = await apiFetch<GlobalSlot[]>("/admin/slots");

  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Slots</h1>
        <p className="text-sm text-muted-foreground">Todos los slots de todos tus productos, en un solo tablero.</p>
      </div>
      <GlobalSlotsTable slots={slots} />
    </main>
  );
}
