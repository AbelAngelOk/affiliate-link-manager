"use server";

import { apiFetch, ApiError } from "@/lib/apiClient";

// Se llama directo desde el cliente (no vía <form action>) para poder
// mostrar el error específico ("contraseña actual incorrecta") en el mismo
// formulario, sin depender de que Next.js decida qué hacer con una
// excepción no capturada en una server action.
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ error?: string }> {
  try {
    await apiFetch("/admin/password", {
      method: "PATCH",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    return {};
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { error: "La contraseña actual no es correcta." };
    }
    return { error: "No se pudo cambiar la contraseña." };
  }
}
