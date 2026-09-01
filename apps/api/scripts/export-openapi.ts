import { writeFile } from "node:fs/promises";
import { buildApp } from "../src/app.js";

// No levanta un puerto: solo registra rutas y lee el spec ya armado por
// @fastify/swagger (ver 03-stack-tecnologico.md §3.4 — nunca se mantiene el
// spec a mano, siempre sale de los schemas de las rutas).
const app = await buildApp();
await app.ready();

const spec = app.swagger();
await writeFile("openapi.json", JSON.stringify(spec, null, 2));

console.log(`openapi.json generado (${Object.keys(spec.paths ?? {}).length} rutas).`);
await app.close();
