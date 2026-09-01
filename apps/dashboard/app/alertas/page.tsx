import { apiFetch } from "@/lib/apiClient";

type AlertSlot = {
  id: string;
  productId: string;
  productTitulo: string;
  provider: string;
  country: string;
  status: string;
};

// Vista prioritaria del dashboard (ver 05-plan-de-desarrollo.md, Etapa 9):
// productos/slots sin ningún link activo, para actuar rápido cuando el
// verificador (Etapa 7) marca algo como unavailable.
export default async function AlertasPage() {
  const slots = await apiFetch<AlertSlot[]>("/admin/slots?status=unavailable");

  return (
    <main>
      <h1>Alertas</h1>
      {slots.length === 0 ? (
        <p>No hay slots sin links activos ahora mismo.</p>
      ) : (
        slots.map((slot) => (
          <div key={slot.id} className="card alert">
            <strong>{slot.productTitulo}</strong>
            <div>
              {slot.provider}:{slot.country} — <span className="badge unavailable">{slot.status}</span>
            </div>
            <a href={`/productos/${slot.productId}`}>Cargar un link nuevo →</a>
          </div>
        ))
      )}
    </main>
  );
}
