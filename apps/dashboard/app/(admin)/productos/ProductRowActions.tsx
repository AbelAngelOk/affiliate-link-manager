"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductFormDialog } from "./ProductFormDialog";
import { deleteProduct, validateProduct } from "./actions";
import type { Product } from "./columns";

export function ProductRowActions({ product }: { product: Product }) {
  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="outline" size="sm">
        <Link href={`/productos/${product.id}`}>Ver detalle</Link>
      </Button>
      <form action={validateProduct}>
        <input type="hidden" name="id" value={product.id} />
        <Button type="submit" variant="ghost" size="sm">
          Validar
        </Button>
      </form>
      <ProductFormDialog
        product={product}
        trigger={
          <Button variant="ghost" size="sm">
            Editar
          </Button>
        }
      />
      <form action={deleteProduct}>
        <input type="hidden" name="id" value={product.id} />
        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
          Borrar
        </Button>
      </form>
    </div>
  );
}
