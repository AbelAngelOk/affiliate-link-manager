"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/apiClient";

// Se llama directo desde el cliente (no vía <form action>) para poder
// mostrar el motivo específico del rechazo (ej. "proporción incorrecta")
// en el mismo formulario — ver 04-alcance-y-limitaciones.md sobre las
// garantías de calidad de imagen.
export async function addProductImage(
  productId: string,
  aspectRatio: "1:1" | "2:3" | "4:5",
  url: string,
): Promise<{ error?: string }> {
  try {
    await apiFetch(`/admin/products/${productId}/images`, {
      method: "POST",
      body: JSON.stringify({ aspect_ratio: aspectRatio, url }),
    });
  } catch (err) {
    if (err instanceof ApiError) {
      const parsed = (() => {
        try {
          return JSON.parse(err.message) as { message?: string };
        } catch {
          return null;
        }
      })();
      return { error: parsed?.message ?? "No se pudo agregar la imagen." };
    }
    return { error: "No se pudo agregar la imagen." };
  }
  revalidatePath(`/productos/${productId}`);
  return {};
}

export async function deleteProductImage(formData: FormData) {
  const productId = formData.get("productId") as string;
  const imageId = formData.get("imageId") as string;
  await apiFetch(`/admin/products/${productId}/images/${imageId}`, { method: "DELETE" });
  revalidatePath(`/productos/${productId}`);
}
