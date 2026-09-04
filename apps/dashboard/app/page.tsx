import Link from "next/link";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "Un producto, muchas apps",
    body: "Cargás un producto una vez y lo asignás a las apps que quieras. Cada app pide sus propios botones filtrando por dominio (amazon.com.mx, mercadolibre.com.ar...).",
  },
  {
    title: "Fallback automático",
    body: "Cada botón puede tener varios links candidatos con prioridad. Si el de mayor prioridad se rompe, el siguiente responde solo — sin tocar código ni republicar la app.",
  },
  {
    title: "Verificación periódica",
    body: "Un job corre contra la API pública de Mercado Libre y contra Amazon para detectar links caídos antes de que un usuario haga click en uno roto.",
  },
  {
    title: "Panel de administración",
    body: "Alta, edición y baja de productos y slots sin tocar la base de datos ni armar requests a mano.",
  },
];

// Entidad separada del portal y de los docs (ver app/layout.tsx): esta es la
// única página que un visitante sin API key debería ver primero.
export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="font-semibold">Links Referidos API</span>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-white hover:bg-neutral-800 hover:text-white">
              <Link href="/docs">Documentación</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/productos">Portal de administración</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Tus links de afiliados, siempre vivos
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
            Una API para gestionar productos y links de afiliados de Amazon y Mercado Libre, pensada para que tus apps
            nunca muestren un botón roto cuando un producto deja de estar disponible.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/docs">Ver documentación</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/productos">Ir al portal</Link>
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="mb-8 text-center text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Cómo funciona
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-lg border bg-white p-5">
                <div className="mb-2 text-sm font-semibold text-muted-foreground">1</div>
                <p className="text-sm">Cargás un producto y sus dominios (Amazon, Mercado Libre) con sus links.</p>
              </div>
              <div className="rounded-lg border bg-white p-5">
                <div className="mb-2 text-sm font-semibold text-muted-foreground">2</div>
                <p className="text-sm">Tu app pide el producto por nombre y arma sus botones con el link vigente de cada dominio.</p>
              </div>
              <div className="rounded-lg border bg-white p-5">
                <div className="mb-2 text-sm font-semibold text-muted-foreground">3</div>
                <p className="text-sm">Si un link se rompe, el próximo de la cola lo reemplaza solo — el botón de tu app nunca cambia.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border p-5">
                <h3 className="mb-1 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 text-sm text-muted-foreground">
          <span>Links Referidos API</span>
          <Link href="/docs" className="hover:underline">
            Documentación →
          </Link>
        </div>
      </footer>
    </div>
  );
}
