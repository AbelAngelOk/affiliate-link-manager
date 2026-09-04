"use client";

import { Button } from "@/components/ui/button";
import { SlotFormDialog } from "./SlotFormDialog";
import { deleteSlot, validateSlot } from "./actions";
import type { Slot } from "./columns";

export function SlotRowActions({ productId, slot }: { productId: string; slot: Slot }) {
  return (
    <div className="flex items-center gap-1">
      <form action={validateSlot}>
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="slot_id" value={slot.id} />
        <Button type="submit" variant="ghost" size="sm">
          Validar
        </Button>
      </form>
      <SlotFormDialog
        productId={productId}
        slot={slot}
        trigger={
          <Button variant="ghost" size="sm">
            Editar
          </Button>
        }
      />
      <form action={deleteSlot}>
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="slot_id" value={slot.id} />
        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
          Borrar
        </Button>
      </form>
    </div>
  );
}
