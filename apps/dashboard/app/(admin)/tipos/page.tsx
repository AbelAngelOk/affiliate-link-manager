import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProductType, deleteProductType, addTypeField, deleteTypeField } from "./actions";

type ProductTypeField = {
  id: string;
  name: string;
  fieldType: "text" | "textarea";
  required: boolean;
};

type ProductType = {
  id: string;
  name: string;
  fields: ProductTypeField[];
};

// "Tipo de producto" con campos definibles por el usuario (ver
// 01-solucion-final.md §2.3): esta pantalla es enteramente CRUD sobre
// ProductType/ProductTypeField — asignar un tipo a un producto puntual y
// cargar sus valores se hace desde el detalle de ese producto.
export default async function TiposPage() {
  const types = await apiFetch<ProductType[]>("/admin/product-types");

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tipos de producto</h1>
        <p className="text-sm text-muted-foreground">
          Cada tipo agrega campos extra (además de título/descripción, que ya son genéricos) a los productos que lo
          usen — ej. un tipo "libro" con los campos "autor" y "nota del propietario".
        </p>
      </div>

      <form action={createProductType} className="flex max-w-sm gap-2">
        <Input name="name" placeholder="Nombre del tipo (ej. libro)" maxLength={60} required />
        <Button type="submit">Crear tipo</Button>
      </form>

      {types.length === 0 && <p className="text-sm text-muted-foreground">Todavía no creaste ningún tipo.</p>}

      <div className="space-y-4">
        {types.map((type) => (
          <div key={type.id} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{type.name}</h2>
              <form action={deleteProductType}>
                <input type="hidden" name="id" value={type.id} />
                <Button type="submit" variant="outline" size="sm">
                  Borrar tipo
                </Button>
              </form>
            </div>

            {type.fields.length > 0 && (
              <table className="mb-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-1 font-normal">Campo</th>
                    <th className="pb-1 font-normal">Formato</th>
                    <th className="pb-1 font-normal">Obligatorio</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {type.fields.map((field) => (
                    <tr key={field.id}>
                      <td className="py-1">{field.name}</td>
                      <td className="py-1">{field.fieldType === "textarea" ? "texto largo" : "texto"}</td>
                      <td className="py-1">{field.required ? "sí" : "no"}</td>
                      <td className="py-1 text-right">
                        <form action={deleteTypeField}>
                          <input type="hidden" name="typeId" value={type.id} />
                          <input type="hidden" name="fieldId" value={field.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Borrar campo
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <form action={addTypeField} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="typeId" value={type.id} />
              <div className="space-y-1">
                <Label htmlFor={`name-${type.id}`}>Campo nuevo</Label>
                <Input id={`name-${type.id}`} name="name" placeholder="ej. autor" maxLength={60} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`field_type-${type.id}`}>Formato</Label>
                <Select name="field_type" defaultValue="text">
                  <SelectTrigger id={`field_type-${type.id}`} className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="textarea">Texto largo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-1 pb-2 text-sm">
                <input type="checkbox" name="required" /> Obligatorio
              </label>
              <Button type="submit" variant="outline">
                Agregar campo
              </Button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
