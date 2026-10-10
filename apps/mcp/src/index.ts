#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerProductTools } from "./tools/products.js";
import { registerSlotTools } from "./tools/slots.js";
import { registerCheckTools } from "./tools/check.js";
import { registerApiKeyTools } from "./tools/apiKeys.js";
import { registerImageTools } from "./tools/images.js";
import { registerProductTypeTools } from "./tools/productTypes.js";
import { registerFieldValueTools } from "./tools/fieldValues.js";

// Envoltorio MCP de la API de administración (ver 01-solucion-final.md) —
// pensado para que Claude Code gestione productos/slots/links de este
// proyecto desde cualquier otra carpeta, sin tener que armar requests a
// mano. No expone /v1/* (lectura pública, pensada para las apps
// consumidoras, no para administración) ni cambio de contraseña (riesgo
// innecesario para lo que esto resuelve).
const server = new McpServer({ name: "links-referidos-mcp", version: "0.0.1" });

registerProductTools(server);
registerSlotTools(server);
registerCheckTools(server);
registerApiKeyTools(server);
registerImageTools(server);
registerProductTypeTools(server);
registerFieldValueTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
