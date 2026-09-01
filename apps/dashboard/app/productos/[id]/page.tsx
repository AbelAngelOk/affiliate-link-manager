import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/apiClient";

type SlotLink = { id: string; affiliateUrl: string; priority: number; status: string };
type Slot = { id: string; provider: string; country: string; status: string; links: SlotLink[] };

export default async function ProductoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const slots = await apiFetch<Slot[]>(`/admin/products/${productId}/slots`);

  async function addSlot(formData: FormData) {
    "use server";
    await apiFetch(`/admin/products/${productId}/slots`, {
      method: "POST",
      body: JSON.stringify({ provider: formData.get("provider"), country: formData.get("country") }),
    });
    revalidatePath(`/productos/${productId}`);
  }

  async function addLink(formData: FormData) {
    "use server";
    const slotId = formData.get("slot_id");
    await apiFetch(`/admin/slots/${slotId}/links`, {
      method: "POST",
      body: JSON.stringify({ affiliate_url: formData.get("affiliate_url") }),
    });
    revalidatePath(`/productos/${productId}`);
  }

  return (
    <main>
      <a href="/productos">← Productos</a>
      <h1>Slots del producto</h1>

      {slots.length === 0 && <p>Este producto todavía no tiene ningún slot.</p>}

      {slots.map((slot) => (
        <div key={slot.id} className={`card ${slot.status !== "active" ? "alert" : ""}`}>
          <h3>
            {slot.provider}:{slot.country} <span className={`badge ${slot.status}`}>{slot.status}</span>
          </h3>

          {slot.links.length === 0 ? (
            <p style={{ color: "#666" }}>Sin links cargados todavía.</p>
          ) : (
            <ul>
              {slot.links
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map((link) => (
                  <li key={link.id}>
                    <span className={`badge ${link.status}`}>{link.status}</span> (prioridad {link.priority}){" "}
                    <a href={link.affiliateUrl} target="_blank" rel="noreferrer">
                      {link.affiliateUrl}
                    </a>
                  </li>
                ))}
            </ul>
          )}

          <form action={addLink} style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input type="hidden" name="slot_id" value={slot.id} />
            <input className="field" style={{ flex: 1, marginBottom: 0 }} name="affiliate_url" placeholder="https://..." required />
            <button className="btn" type="submit">
              Agregar link
            </button>
          </form>
        </div>
      ))}

      <h2>Nuevo slot</h2>
      <form action={addSlot} style={{ display: "flex", gap: 8 }}>
        <select className="field" style={{ marginBottom: 0 }} name="provider" required>
          <option value="amazon">amazon</option>
          <option value="mercadolibre">mercadolibre</option>
        </select>
        <input
          className="field"
          style={{ marginBottom: 0, width: 100 }}
          name="country"
          placeholder="mx, us, ar..."
          maxLength={5}
          required
        />
        <button className="btn" type="submit">
          Crear slot
        </button>
      </form>
    </main>
  );
}
