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

export async function setProductType(formData: FormData) {
  const productId = formData.get("productId") as string;
  const productTypeId = formData.get("productTypeId") as string;
  await apiFetch(`/admin/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ product_type_id: productTypeId || null }),
  });
  revalidatePath(`/productos/${productId}`);
}

// Directo desde el cliente (no <form action>) para poder mostrar el motivo
// específico si falta un campo obligatorio, en vez de un error genérico.
export async function saveFieldValues(productId: string, values: Record<string, string>): Promise<{ error?: string }> {
  try {
    await apiFetch(`/admin/products/${productId}/field-values`, {
      method: "PUT",
      body: JSON.stringify({ values }),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      return { error: "Falta cargar un campo obligatorio." };
    }
    return { error: "No se pudieron guardar los campos." };
  }
  revalidatePath(`/productos/${productId}`);
  return {};
}
