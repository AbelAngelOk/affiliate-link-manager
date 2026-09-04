"use client";

import { Button } from "@/components/ui/button";
import { validateApp } from "./actions";

export function AppRowActions({ nombre }: { nombre: string }) {
  return (
    <form action={validateApp}>
      <input type="hidden" name="nombre" value={nombre} />
      <Button type="submit" variant="outline" size="sm">
        Validar
      </Button>
    </form>
  );
}
