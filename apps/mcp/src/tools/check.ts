import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "../apiClient.js";
import { handle } from "../toolResult.js";

// Disparadores manuales del verificador de disponibilidad (ver
// 06-verificacion-de-disponibilidad.md) — misma lógica que la corrida
// periódica, solo cambia qué slots se chequean.
export function registerCheckTools(server: McpServer) {
  server.registerTool(
    "validate_slot",
    { description: "Valida un slot puntual contra el marketplace real", inputSchema: { slot_id: z.string() } },
    ({ slot_id }) => handle(() => apiRequest(`/admin/slots/${slot_id}/check`, { method: "POST" })),
  );

  server.registerTool(
    "validate_product",
    { description: "Valida todos los slots de un producto", inputSchema: { product_id: z.string() } },
    ({ product_id }) => handle(() => apiRequest(`/admin/products/${product_id}/check`, { method: "POST" })),
  );

  server.registerTool(
    "validate_app",
    {
      description: "Valida todos los slots de todos los productos que tengan esta app asignada",
      inputSchema: { app_name: z.string() },
    },
    ({ app_name }) =>
      handle(() => apiRequest(`/admin/apps/${encodeURIComponent(app_name)}/check`, { method: "POST" })),
  );
}
