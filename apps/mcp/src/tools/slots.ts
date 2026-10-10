import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "../apiClient.js";
import { handle } from "../toolResult.js";

export function registerSlotTools(server: McpServer) {
  server.registerTool(
    "list_slots",
    {
      description: "Tablero global: todos tus slots de todos los productos, con el producto de cada uno",
      inputSchema: { status: z.enum(["active", "broken"]).optional() },
    },
    ({ status }) =>
      handle(() => apiRequest(`/admin/slots${status ? `?status=${status}` : ""}`)),
  );

  server.registerTool(
    "list_product_slots",
    { description: "Lista los slots (links candidatos) de un producto puntual", inputSchema: { product_id: z.string() } },
    ({ product_id }) => handle(() => apiRequest(`/admin/products/${product_id}/slots`)),
  );

  server.registerTool(
    "create_slot",
    {
      description:
        "Crea un slot (link de afiliado + prioridad) para un dominio de un producto. Sin priority, se agrega al final de la cola de ese dominio.",
      inputSchema: {
        product_id: z.string(),
        dominio: z.string().min(3).max(60).describe("ej. amazon.com.mx, mercadolibre.com.ar"),
        affiliate_url: z.string().url(),
        priority: z.number().int().min(0).optional(),
      },
    },
    ({ product_id, ...body }) =>
      handle(() => apiRequest(`/admin/products/${product_id}/slots`, { method: "POST", body: JSON.stringify(body) })),
  );

  server.registerTool(
    "update_slot",
    {
      description: "Edita el link, la prioridad o el estado de un slot existente (no se puede cambiar el dominio)",
      inputSchema: {
        slot_id: z.string(),
        affiliate_url: z.string().url().optional(),
        priority: z.number().int().min(0).optional(),
        status: z.enum(["active", "broken"]).optional(),
      },
    },
    ({ slot_id, ...body }) =>
      handle(() => apiRequest(`/admin/slots/${slot_id}`, { method: "PATCH", body: JSON.stringify(body) })),
  );

  server.registerTool(
    "delete_slot",
    { description: "Borra un slot", inputSchema: { slot_id: z.string() } },
    ({ slot_id }) => handle(() => apiRequest(`/admin/slots/${slot_id}`, { method: "DELETE" })),
  );
}
