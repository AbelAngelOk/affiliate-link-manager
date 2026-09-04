"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/apiClient";

// Un slot es un único link + prioridad para un dominio (ver
// 01-solucion-final.md §2). No se puede cambiar el dominio de un slot
// existente — si hace falta otro, se crea uno nuevo.
export async function createSlot(formData: FormData) {
  const productId = formData.get("product_id") as string;
  const priorityRaw = formData.get("priority");

  await apiFetch(`/admin/products/${productId}/slots`, {
    method: "POST",
    body: JSON.stringify({
      dominio: formData.get("dominio"),
      affiliate_url: formData.get("affiliate_url"),
      priority: priorityRaw ? Number(priorityRaw) : undefined,
    }),
  });
  revalidatePath(`/productos/${productId}`);
  revalidatePath("/slots");
}

export async function updateSlot(formData: FormData) {
  const productId = formData.get("product_id") as string;
  const slotId = formData.get("slot_id") as string;
  const priorityRaw = formData.get("priority");

  await apiFetch(`/admin/slots/${slotId}`, {
    method: "PATCH",
    body: JSON.stringify({
      affiliate_url: formData.get("affiliate_url"),
      priority: priorityRaw ? Number(priorityRaw) : undefined,
      status: formData.get("status"),
    }),
  });
  revalidatePath(`/productos/${productId}`);
  revalidatePath("/slots");
}

export async function deleteSlot(formData: FormData) {
  const productId = formData.get("product_id") as string;
  await apiFetch(`/admin/slots/${formData.get("slot_id")}`, { method: "DELETE" });
  revalidatePath(`/productos/${productId}`);
  revalidatePath("/slots");
}

// Dispara el verificador a demanda sobre un solo slot (ver
// 06-verificacion-de-disponibilidad.md) — misma lógica y umbral que la
// corrida periódica, solo que ahora mismo en vez de esperar al cron.
export async function validateSlot(formData: FormData) {
  const productId = formData.get("product_id") as string;
  await apiFetch(`/admin/slots/${formData.get("slot_id")}/check`, { method: "POST" });
  revalidatePath(`/productos/${productId}`);
  revalidatePath("/slots");
}
