"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/apiClient";

// A diferencia de createProduct/etc., esta se llama directo desde el
// cliente (no vía <form action>) porque necesitamos el valor de vuelta: la
// key en texto plano solo se puede mostrar una vez, justo acá (ver
// ApiKeyCreateDialog.tsx).
export async function createApiKey(name: string) {
  const created = await apiFetch<{ id: string; name: string; createdAt: string; key: string }>("/admin/api-keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  revalidatePath("/api-keys");
  return created;
}

export async function revokeApiKey(formData: FormData) {
  const id = formData.get("id") as string;
  await apiFetch(`/admin/api-keys/${id}`, { method: "DELETE" });
  revalidatePath("/api-keys");
}
