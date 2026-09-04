"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProduct, updateProduct } from "./actions";
import type { Product } from "./columns";

// Un mismo diálogo sirve para crear y editar: si viene `product`, precarga
// los campos y llama a updateProduct; si no, arranca vacío y llama a
// createProduct. `trigger` es el elemento que abre el popup (botón "Crear
// producto" en la página, o "Editar" en el menú de acciones de la fila).
export function ProductFormDialog({ product, trigger }: { product?: Product; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(product);

  async function handleSubmit(formData: FormData) {
    if (isEdit) await updateProduct(formData);
    else await createProduct(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={product!.id} />}
          <div className="space-y-1">
            <Label htmlFor="titulo">Título (máx. 80 caracteres)</Label>
            <Input id="titulo" name="titulo" maxLength={80} defaultValue={product?.titulo} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="descripcion_corta">Descripción corta (máx. 160 caracteres)</Label>
            <Input
              id="descripcion_corta"
              name="descripcion_corta"
              maxLength={160}
              defaultValue={product?.descripcionCorta}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="imagen_url">URL de imagen</Label>
            <Input id="imagen_url" name="imagen_url" type="url" defaultValue={product?.imagenUrl} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="categoria">Categoría (máx. 40 caracteres)</Label>
            <Input id="categoria" name="categoria" maxLength={40} defaultValue={product?.categoria} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="apps">Apps (separadas por coma)</Label>
            <Input
              id="apps"
              name="apps"
              placeholder="despertador-app, training-app"
              defaultValue={product?.apps.join(", ")}
            />
          </div>
          <DialogFooter>
            <Button type="submit">{isEdit ? "Guardar cambios" : "Crear producto"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
