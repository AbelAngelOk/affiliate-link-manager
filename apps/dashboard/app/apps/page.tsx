import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/apiClient";

type App = { id: string; nombre: string; bundleId: string; activo: boolean };

async function createApp(formData: FormData) {
  "use server";
  await apiFetch("/admin/apps", {
    method: "POST",
    body: JSON.stringify({ nombre: formData.get("nombre"), bundle_id: formData.get("bundle_id") }),
  });
  revalidatePath("/apps");
}

export default async function AppsPage() {
  const apps = await apiFetch<App[]>("/admin/apps");

  return (
    <main>
      <h1>Apps</h1>
      {apps.length === 0 && <p>Todavía no cargaste ninguna app.</p>}
      {apps.map((a) => (
        <div key={a.id} className="card">
          <strong>{a.nombre}</strong>
          <div style={{ color: "#666" }}>{a.bundleId}</div>
          <code style={{ fontSize: "0.8em", color: "#999" }}>{a.id}</code>
        </div>
      ))}

      <h2>Nueva app</h2>
      <form action={createApp}>
        <input className="field" name="nombre" placeholder="Nombre (ej. despertador-app)" required />
        <input className="field" name="bundle_id" placeholder="Bundle id / dominio" required />
        <button className="btn" type="submit">
          Crear app
        </button>
      </form>
    </main>
  );
}
