import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/apiClient";

type Product = { id: string; titulo: string; categoria: string };

async function createProduct(formData: FormData) {
  "use server";
  await apiFetch("/admin/products", {
    method: "POST",
    body: JSON.stringify({
      titulo: formData.get("titulo"),
      descripcion_corta: formData.get("descripcion_corta"),
      imagen_url: formData.get("imagen_url"),
      categoria: formData.get("categoria"),
    }),
  });
  revalidatePath("/productos");
}

export default async function ProductosPage() {
  const products = await apiFetch<Product[]>("/admin/products");

  return (
    <main>
      <h1>Productos</h1>
      {products.length === 0 && <p>Todavía no cargaste ningún producto.</p>}
      {products.map((p) => (
        <div key={p.id} className="card">
          <a href={`/productos/${p.id}`}>
            <strong>{p.titulo}</strong>
          </a>
          <div style={{ color: "#666" }}>{p.categoria}</div>
        </div>
      ))}

      <h2>Nuevo producto</h2>
      <form action={createProduct}>
        <input className="field" name="titulo" placeholder="Título (máx. 80 caracteres)" maxLength={80} required />
        <input
          className="field"
          name="descripcion_corta"
          placeholder="Descripción corta (máx. 160 caracteres)"
          maxLength={160}
          required
        />
        <input className="field" name="imagen_url" placeholder="URL de imagen" required />
        <input className="field" name="categoria" placeholder="Categoría (máx. 40 caracteres)" maxLength={40} required />
        <button className="btn" type="submit">
          Crear producto
        </button>
      </form>
    </main>
  );
}
