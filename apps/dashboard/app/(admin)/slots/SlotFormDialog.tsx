"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSlot, updateSlot } from "./actions";
import type { Slot } from "./columns";

// El dominio no se puede editar (es la identidad del slot, ver
// db/schema.ts) — en modo edición se muestra sin poder tocarse; en modo
// creación es el único campo obligatorio junto con el link.
export function SlotFormDialog({ productId, slot, trigger }: { productId: string; slot?: Slot; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(slot);

  async function handleSubmit(formData: FormData) {
    if (isEdit) await updateSlot(formData);
    else await createSlot(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar slot" : "Nuevo slot"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-3">
          <input type="hidden" name="product_id" value={productId} />
          {isEdit && <input type="hidden" name="slot_id" value={slot!.id} />}

          <div className="space-y-1">
            <Label htmlFor="dominio">Dominio</Label>
            <Input
              id="dominio"
              name="dominio"
              placeholder="amazon.com.mx, mercadolibre.com.ar..."
              maxLength={60}
              defaultValue={slot?.dominio}
              disabled={isEdit}
              required={!isEdit}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="affiliate_url">Link de afiliado</Label>
            <Input
              id="affiliate_url"
              name="affiliate_url"
              type="url"
              placeholder="https://..."
              defaultValue={slot?.affiliateUrl}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="priority">
              Prioridad {!isEdit && "(opcional — si la dejás vacía, se agrega al final de la cola de ese dominio)"}
            </Label>
            <Input id="priority" name="priority" type="number" min={0} defaultValue={slot?.priority} placeholder="0 = mayor prioridad" />
          </div>
          {isEdit && (
            <div className="space-y-1">
              <Label htmlFor="status">Estado</Label>
              <Select name="status" defaultValue={slot?.status}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="broken">broken</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="submit">{isEdit ? "Guardar cambios" : "Crear slot"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
