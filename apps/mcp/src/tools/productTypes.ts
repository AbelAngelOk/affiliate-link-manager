import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "../apiClient.js";
import { handle } from "../toolResult.js";

// "Tipo de producto" con campos definidos por el usuario (ver
// 01-solucion-final.md §2.4) — ej. un tipo "libro" con los campos "autor" y
// "nota del propietario", además de los campos genéricos de Product.
export function registerProductTypeTools(server: McpServer) {
  server.registerTool(
    "list_product_types",
    { description: "Lista tus tipos de producto, con sus campos", inputSchema: {} },
    () => handle(() => apiRequest("/admin/product-types")),
  );

  server.registerTool(
    "create_product_type",
    { description: "Crea un tipo de producto (ej. libro)", inputSchema: { name: z.string().min(1).max(60) } },
    ({ name }) => handle(() => apiRequest("/admin/product-types", { method: "POST", body: JSON.stringify({ name }) })),
  );

  server.registerTool(
    "delete_product_type",
    {
      description: "Borra un tipo de producto — los productos que lo tenían asignado solo pierden la asignación",
      inputSchema: { product_type_id: z.string() },
    },
    ({ product_type_id }) => handle(() => apiRequest(`/admin/product-types/${product_type_id}`, { method: "DELETE" })),
  );

  server.registerTool(
    "add_type_field",
    {
      description: "Agrega un campo a un tipo de producto (ej. autor)",
      inputSchema: {
        product_type_id: z.string(),
        name: z.string().min(1).max(60),
        field_type: z.enum(["text", "textarea"]).optional().describe("Default: text (una línea)"),
        required: z.boolean().optional(),
      },
    },
    ({ product_type_id, ...body }) =>
      handle(() => apiRequest(`/admin/product-types/${product_type_id}/fields`, { method: "POST", body: JSON.stringify(body) })),
  );

  server.registerTool(
    "delete_type_field",
    {
      description: "Borra un campo de un tipo (borra también los valores ya cargados con él en cualquier producto)",
      inputSchema: { product_type_id: z.string(), field_id: z.string() },
    },
    ({ product_type_id, field_id }) =>
      handle(() => apiRequest(`/admin/product-types/${product_type_id}/fields/${field_id}`, { method: "DELETE" })),
  );
}
