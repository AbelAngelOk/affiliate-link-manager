"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/apiClient";

function parseApps(formData: FormData): string[] {
  return String(formData.get("apps") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createProduct(formData: FormData) {
  await apiFetch("/admin/products", {
    method: "POST",
    body: JSON.stringify({
      titulo: formData.get("titulo"),
      descripcion_corta: formData.get("descripcion_corta"),
      imagen_url: formData.get("imagen_url"),
      categoria: formData.get("categoria"),
      apps: parseApps(formData),
    }),
  });
  revalidatePath("/productos");
}

export async function updateProduct(formData: FormData) {
  const id = formData.get("id") as string;
  await apiFetch(`/admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      titulo: formData.get("titulo"),
      descripcion_corta: formData.get("descripcion_corta"),
      imagen_url: formData.get("imagen_url"),
      categoria: formData.get("categoria"),
      apps: parseApps(formData),
    }),
  });
  revalidatePath("/productos");
}

export async function deleteProduct(formData: FormData) {
  const id = formData.get("id") as string;
  await apiFetch(`/admin/products/${id}`, { method: "DELETE" });
  revalidatePath("/productos");
}

// Dispara el verificador a demanda sobre todos los slots del producto (ver
// 06-verificacion-de-disponibilidad.md).
export async function validateProduct(formData: FormData) {
  const id = formData.get("id") as string;
  await apiFetch(`/admin/products/${id}/check`, { method: "POST" });
  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
}
