import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hay un package-lock.json ajeno a este repo en C:\Users\abela (fuera del
  // proyecto) que confunde la detección automática de la raíz del monorepo
  // en desarrollo local. Se fija explícitamente para que apunte siempre a
  // este repo. En Vercel NO hace falta (y duplica la ruta si se fuerza,
  // porque ahí la raíz del build ya coincide con la del repo).
  ...(process.env.VERCEL ? {} : { outputFileTracingRoot: path.join(__dirname, "../..") }),
};

export default nextConfig;
