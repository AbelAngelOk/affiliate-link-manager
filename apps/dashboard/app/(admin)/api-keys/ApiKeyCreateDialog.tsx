"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createApiKey } from "./actions";

// Dos pantallas en el mismo diálogo: primero el nombre, después el valor de
// la key recién creada — que solo se muestra acá, una única vez (el backend
// no vuelve a devolverlo, solo guarda su hash). Por eso esta acción se llama
// directo (no vía <form action>): necesitamos el valor de vuelta.
export function ApiKeyCreateDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setName("");
      setCreatedKey(null);
    }
  }

  async function handleCreate() {
    setLoading(true);
    const created = await createApiKey(name);
    setLoading(false);
    setCreatedKey(created.key);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Nueva API key</Button>
      </DialogTrigger>
      <DialogContent>
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Guardá esta key ahora</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              No se vuelve a mostrar. Pegala en la configuración de tu app — no expira sola, funciona hasta que la
              revoques.
            </p>
            <code className="block overflow-x-auto rounded-md bg-muted p-3 text-sm">{createdKey}</code>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nueva API key</DialogTitle>
            </DialogHeader>
            <div className="space-y-1">
              <Label htmlFor="name">Nombre (para identificarla después, ej. "training-app")</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={loading || !name.trim()}>
                {loading ? "Generando..." : "Generar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
