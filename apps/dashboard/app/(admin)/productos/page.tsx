import { apiFetch } from "@/lib/apiClient";
import { DataTable } from "@/components/data-table";
import { productColumns, type Product } from "./columns";
import { ProductFormDialog } from "./ProductFormDialog";
import { Button } from "@/components/ui/button";

export default async function ProductosPage() {
  const products = await apiFetch<Product[]>("/admin/products");

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <ProductFormDialog trigger={<Button>Crear producto</Button>} />
      </div>
      <DataTable columns={productColumns} data={products} emptyMessage="Todavía no cargaste ningún producto." />
    </main>
  );
}
