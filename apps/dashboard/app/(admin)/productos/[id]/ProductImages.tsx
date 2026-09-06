"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addProductImage, deleteProductImage } from "./actions";

export type ProductImage = {
  id: string;
  aspectRatio: "1:1" | "2:3" | "4:5";
  url: string;
  position: number;
};

const SETS: { key: "1:1" | "2:3" | "4:5"; label: string; hint: string }[] = [
  { key: "1:1", label: "Cuadrada (1:1)", hint: "mínimo 500x500px" },
  { key: "2:3", label: "Portada (2:3)", hint: "mínimo 500x750px" },
  { key: "4:5", label: "Retrato (4:5)", hint: "mínimo 500x625px" },
];

function ImageSet({ productId, aspectRatio, label, hint, images }: {
  productId: string;
  aspectRatio: "1:1" | "2:3" | "4:5";
  label: string;
  hint: string;
  images: ProductImage[];
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    setLoading(true);
    setError(null);
    const result = await addProductImage(productId, aspectRatio, url);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setUrl("");
  }

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint} — opcional, podés cargar varias.</p>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.id} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-24 w-24 rounded object-cover" />
              <form action={deleteProductImage}>
                <input type="hidden" name="productId" value={productId} />
                <input type="hidden" name="imageId" value={img.id} />
                <Button type="submit" variant="outline" size="sm" className="w-full">
                  Borrar
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button type="button" onClick={handleAdd} disabled={loading || !url.trim()}>
          {loading ? "Agregando..." : "Agregar"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function ProductImages({ productId, images }: { productId: string; images: ProductImage[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Imágenes adicionales</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {SETS.map((set) => (
          <ImageSet
            key={set.key}
            productId={productId}
            aspectRatio={set.key}
            label={set.label}
            hint={set.hint}
            images={images.filter((img) => img.aspectRatio === set.key)}
          />
        ))}
      </div>
    </div>
  );
}
