import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { SlotsTable } from "@/app/(admin)/slots/SlotsTable";
import { SlotFormDialog } from "@/app/(admin)/slots/SlotFormDialog";
import type { Slot } from "@/app/(admin)/slots/columns";
import { validateProduct } from "@/app/(admin)/productos/actions";
import { Button } from "@/components/ui/button";

export default async function ProductoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const slots = await apiFetch<Slot[]>(`/admin/products/${productId}/slots`);

  return (
    <main className="space-y-4">
      <Link href="/productos" className="text-sm text-muted-foreground hover:underline">
        ← Productos
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Slots del producto</h1>
        <div className="flex items-center gap-2">
          <form action={validateProduct}>
            <input type="hidden" name="id" value={productId} />
            <Button type="submit" variant="outline">
              Validar todos
            </Button>
          </form>
          <SlotFormDialog productId={productId} trigger={<Button>Crear slot</Button>} />
        </div>
      </div>

      <SlotsTable productId={productId} slots={slots} />
    </main>
  );
}
