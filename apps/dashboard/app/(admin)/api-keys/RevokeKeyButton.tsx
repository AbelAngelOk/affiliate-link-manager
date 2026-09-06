"use client";

import { Button } from "@/components/ui/button";
import { revokeApiKey } from "./actions";

export function RevokeKeyButton({ id }: { id: string }) {
  return (
    <form action={revokeApiKey}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm">
        Revocar
      </Button>
    </form>
  );
}
