"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/apiClient";

export async function createProductType(formData: FormData) {
  await apiFetch("/admin/product-types", {
    method: "POST",
    body: JSON.stringify({ name: formData.get("name") }),
  });
  revalidatePath("/tipos");
}

export async function deleteProductType(formData: FormData) {
  const id = formData.get("id") as string;
  await apiFetch(`/admin/product-types/${id}`, { method: "DELETE" });
  revalidatePath("/tipos");
}

export async function addTypeField(formData: FormData) {
  const typeId = formData.get("typeId") as string;
  await apiFetch(`/admin/product-types/${typeId}/fields`, {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      field_type: formData.get("field_type"),
      required: formData.get("required") === "on",
    }),
  });
  revalidatePath("/tipos");
}

export async function deleteTypeField(formData: FormData) {
  const typeId = formData.get("typeId") as string;
  const fieldId = formData.get("fieldId") as string;
  await apiFetch(`/admin/product-types/${typeId}/fields/${fieldId}`, { method: "DELETE" });
  revalidatePath("/tipos");
}
