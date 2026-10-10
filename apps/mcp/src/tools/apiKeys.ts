import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "../apiClient.js";
import { handle } from "../toolResult.js";

// Administra las read API keys de /v1/* (ver 01-solucion-final.md §3) — no
// confundir con las credenciales de este mismo servidor MCP, que usa el
// JWT de sesión, no una read key (esas son solo lectura).
export function registerApiKeyTools(server: McpServer) {
  server.registerTool(
    "list_api_keys",
    { description: "Lista tus read API keys (sin el valor, solo metadata)", inputSchema: {} },
    () => handle(() => apiRequest("/admin/api-keys")),
  );

  server.registerTool(
    "create_api_key",
    {
      description:
        "Genera una read API key nueva para que una app consuma /v1/* indefinidamente. El valor solo se devuelve esta vez — guardalo.",
      inputSchema: { name: z.string().min(1).max(60) },
    },
    ({ name }) => handle(() => apiRequest("/admin/api-keys", { method: "POST", body: JSON.stringify({ name }) })),
  );

  server.registerTool(
    "revoke_api_key",
    { description: "Revoca una read API key", inputSchema: { key_id: z.string() } },
    ({ key_id }) => handle(() => apiRequest(`/admin/api-keys/${key_id}`, { method: "DELETE" })),
  );
}
