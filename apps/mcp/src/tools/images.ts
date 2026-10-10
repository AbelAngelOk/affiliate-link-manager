import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "../apiClient.js";
import { handle } from "../toolResult.js";

// Imágenes adicionales por producto, en tres conjuntos opcionales por
// proporción (ver 01-solucion-final.md §2.3) — la API valida las
// dimensiones reales del archivo al cargarlas, esto solo manda la URL.
export function registerImageTools(server: McpServer) {
  server.registerTool(
    "list_product_images",
    { description: "Lista las imágenes adicionales de un producto, agrupadas por proporción", inputSchema: { product_id: z.string() } },
    ({ product_id }) => handle(() => apiRequest(`/admin/products/${product_id}/images`)),
  );

  server.registerTool(
    "add_product_image",
    {
      description:
        "Agrega una imagen a un conjunto (1:1, 2:3 o 4:5) de un producto — la API rechaza con detalle si la proporción real del archivo no coincide (mínimo 500px de ancho, 3% de tolerancia)",
      inputSchema: {
        product_id: z.string(),
        aspect_ratio: z.enum(["1:1", "2:3", "4:5"]),
        url: z.string().url(),
      },
    },
    ({ product_id, ...body }) =>
      handle(() => apiRequest(`/admin/products/${product_id}/images`, { method: "POST", body: JSON.stringify(body) })),
  );

  server.registerTool(
    "delete_product_image",
    { description: "Borra una imagen adicional", inputSchema: { product_id: z.string(), image_id: z.string() } },
    ({ product_id, image_id }) =>
      handle(() => apiRequest(`/admin/products/${product_id}/images/${image_id}`, { method: "DELETE" })),
  );
}
