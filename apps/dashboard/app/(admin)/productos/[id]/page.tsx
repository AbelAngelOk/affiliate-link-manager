import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { SlotsTable } from "@/app/(admin)/slots/SlotsTable";
import { SlotFormDialog } from "@/app/(admin)/slots/SlotFormDialog";
import type { Slot } from "@/app/(admin)/slots/columns";
import { validateProduct } from "@/app/(admin)/productos/actions";
import { Button } from "@/components/ui/button";
import { ProductImages, type ProductImage } from "./ProductImages";
import { ProductTypeSection } from "./ProductTypeSection";

type ProductType = { id: string; name: string };
type FieldValue = { id: string; name: string; fieldType: "text" | "textarea"; required: boolean; value: string };

export default async function ProductoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const [slots, images, product, types, fieldValues] = await Promise.all([
    apiFetch<Slot[]>(`/admin/products/${productId}/slots`),
    apiFetch<ProductImage[]>(`/admin/products/${productId}/images`),
    apiFetch<{ productTypeId: string | null }>(`/admin/products/${productId}`),
    apiFetch<ProductType[]>("/admin/product-types"),
    apiFetch<FieldValue[]>(`/admin/products/${productId}/field-values`),
  ]);

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

      <ProductImages productId={productId} images={images} />

      <ProductTypeSection
        productId={productId}
        types={types}
        currentTypeId={product.productTypeId}
        fields={fieldValues}
      />
    </main>
  );
}
