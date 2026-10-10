import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "../apiClient.js";
import { handle } from "../toolResult.js";

const productFields = {
  titulo: z.string().max(80).describe("Máx 80 caracteres"),
  descripcion_corta: z.string().max(160).describe("Máx 160 caracteres"),
  descripcion_larga: z.string().max(500).optional().describe("Máx 500 caracteres, opcional"),
  imagen_url: z.string().url().describe("Imagen de portada"),
  imagen_alt: z.string().max(125).optional(),
  categoria: z.string().max(40),
  apps: z.array(z.string()).optional().describe("Nombres de app que muestran este producto"),
  product_type_id: z.string().nullable().optional().describe("Id de un tipo de producto, o null para desasignar"),
};

export function registerProductTools(server: McpServer) {
  server.registerTool(
    "list_products",
    { description: "Lista todos tus productos", inputSchema: {} },
    () => handle(() => apiRequest("/admin/products")),
  );

  server.registerTool(
    "get_product",
    { description: "Trae un producto puntual", inputSchema: { product_id: z.string() } },
    ({ product_id }) => handle(() => apiRequest(`/admin/products/${product_id}`)),
  );

  server.registerTool(
    "create_product",
    {
      description: "Crea un producto nuevo",
      inputSchema: {
        titulo: productFields.titulo,
        descripcion_corta: productFields.descripcion_corta,
        descripcion_larga: productFields.descripcion_larga,
        imagen_url: productFields.imagen_url,
        imagen_alt: productFields.imagen_alt,
        categoria: productFields.categoria,
        apps: productFields.apps,
        product_type_id: productFields.product_type_id,
      },
    },
    (body) => handle(() => apiRequest("/admin/products", { method: "POST", body: JSON.stringify(body) })),
  );

  server.registerTool(
    "update_product",
    {
      description: "Edita un producto existente (solo los campos que mandes)",
      inputSchema: {
        product_id: z.string(),
        titulo: productFields.titulo.optional(),
        descripcion_corta: productFields.descripcion_corta.optional(),
        descripcion_larga: productFields.descripcion_larga,
        imagen_url: productFields.imagen_url.optional(),
        imagen_alt: productFields.imagen_alt,
        categoria: productFields.categoria.optional(),
        apps: productFields.apps,
        product_type_id: productFields.product_type_id,
      },
    },
    ({ product_id, ...body }) =>
      handle(() => apiRequest(`/admin/products/${product_id}`, { method: "PATCH", body: JSON.stringify(body) })),
  );

  server.registerTool(
    "delete_product",
    { description: "Borra un producto (y sus slots/imágenes/valores de campo)", inputSchema: { product_id: z.string() } },
    ({ product_id }) => handle(() => apiRequest(`/admin/products/${product_id}`, { method: "DELETE" })),
  );
}
