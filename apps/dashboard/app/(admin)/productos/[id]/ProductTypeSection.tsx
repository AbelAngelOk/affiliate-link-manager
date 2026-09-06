"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setProductType, saveFieldValues } from "./actions";

type ProductType = { id: string; name: string };
type FieldValue = { id: string; name: string; fieldType: "text" | "textarea"; required: boolean; value: string };

export function ProductTypeSection({
  productId,
  types,
  currentTypeId,
  fields,
}: {
  productId: string;
  types: ProductType[];
  currentTypeId: string | null;
  fields: FieldValue[];
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.id, f.value])),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await saveFieldValues(productId, values);
    setSaving(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Tipo de producto</h2>

      <form action={setProductType} className="flex items-end gap-2">
        <input type="hidden" name="productId" value={productId} />
        <div className="space-y-1">
          <Label htmlFor="productTypeId">Tipo</Label>
          <Select name="productTypeId" defaultValue={currentTypeId ?? ""}>
            <SelectTrigger id="productTypeId" className="w-56">
              <SelectValue placeholder="Sin tipo asignado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin tipo asignado</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="outline">
          Guardar tipo
        </Button>
      </form>

      {fields.length > 0 && (
        <div className="max-w-md space-y-3 rounded-lg border p-4">
          {fields.map((field) => (
            <div key={field.id} className="space-y-1">
              <Label htmlFor={`field-${field.id}`}>
                {field.name}
                {field.required && " *"}
              </Label>
              <Input
                id={`field-${field.id}`}
                value={values[field.id] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
              />
            </div>
          ))}
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar campos"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
