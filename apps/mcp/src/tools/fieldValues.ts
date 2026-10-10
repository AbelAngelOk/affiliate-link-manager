import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "../apiClient.js";
import { handle } from "../toolResult.js";

export function registerFieldValueTools(server: McpServer) {
  server.registerTool(
    "get_field_values",
    {
      description:
        "Trae los campos del tipo asignado a un producto, con su valor actual (vacío si no se cargó, [] si el producto no tiene tipo)",
      inputSchema: { product_id: z.string() },
    },
    ({ product_id }) => handle(() => apiRequest(`/admin/products/${product_id}/field-values`)),
  );

  server.registerTool(
    "save_field_values",
    {
      description:
        "Guarda los valores de los campos del tipo asignado a un producto — reemplaza todos de una vez, rechaza si falta un campo obligatorio. `values` es un objeto { field_id: valor }.",
      inputSchema: { product_id: z.string(), values: z.record(z.string(), z.string()) },
    },
    ({ product_id, values }) =>
      handle(() =>
        apiRequest(`/admin/products/${product_id}/field-values`, { method: "PUT", body: JSON.stringify({ values }) }),
      ),
  );
}
