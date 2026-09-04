import { apiFetch } from "@/lib/apiClient";
import { DataTable } from "@/components/data-table";
import { appColumns, type AppRow } from "./columns";
import type { Product } from "@/app/(admin)/productos/columns";

function groupByApp(products: Product[]): AppRow[] {
  const byApp = new Map<string, AppRow>();
  for (const product of products) {
    for (const nombre of product.apps) {
      const entry = byApp.get(nombre) ?? { nombre, productos: [] };
      entry.productos.push({ id: product.id, titulo: product.titulo });
      byApp.set(nombre, entry);
    }
  }
  return Array.from(byApp.values());
}

// No hay entidad App propia (ver 01-solucion-final.md §2) — esta página
// agrega los nombres de app que aparecen en products.apps[], no un CRUD.
export default async function AppsPage() {
  const products = await apiFetch<Product[]>("/admin/products");
  const apps = groupByApp(products);

  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Apps</h1>
        <p className="text-sm text-muted-foreground">
          Nombres de app en uso, derivados de los productos. Para asignar un producto a una app nueva, editalo desde Productos.
        </p>
      </div>
      <DataTable columns={appColumns} data={apps} emptyMessage="Ningún producto tiene apps asignadas todavía." />
    </main>
  );
}
