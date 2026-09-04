"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/apiClient";

// Dispara el verificador a demanda sobre todos los slots de todos los
// productos que tengan esta app asignada (ver
// 06-verificacion-de-disponibilidad.md). No hay entidad App propia — el
// nombre alcanza para identificar el conjunto (ver 01-solucion-final.md §2).
export async function validateApp(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  await apiFetch(`/admin/apps/${encodeURIComponent(nombre)}/check`, { method: "POST" });
  revalidatePath("/apps");
  revalidatePath("/productos");
  revalidatePath("/slots");
}
