import { apiFetch } from "@/lib/apiClient";
import { DataTable } from "@/components/data-table";
import { apiKeyColumns, type ApiKeyRow } from "./columns";
import { ApiKeyCreateDialog } from "./ApiKeyCreateDialog";

// Administración de las read API keys de /v1/* (ver
// 01-solucion-final.md §3 y apps/api/src/plugins/requireReadKey.ts): a
// diferencia de tu sesión (30 días), estas no expiran solas — son para que
// tu app las use indefinidamente una vez integrada.
export default async function ApiKeysPage() {
  const keys = await apiFetch<ApiKeyRow[]>("/admin/api-keys");

  return (
    <main className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Para que tus apps llamen a <code className="rounded bg-muted px-1 py-0.5">GET /v1/products</code> sin
            depender de tu sesión, que vence a los 30 días. El valor solo se muestra una vez, al crearla.
          </p>
        </div>
        <ApiKeyCreateDialog />
      </div>
      <DataTable columns={apiKeyColumns} data={keys} emptyMessage="Todavía no generaste ninguna API key." />
    </main>
  );
}
