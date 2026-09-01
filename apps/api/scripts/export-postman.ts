import { writeFile } from "node:fs/promises";
// @ts-expect-error -- openapi-to-postmanv2 no trae tipos propios
import converter from "openapi-to-postmanv2";
import { buildApp } from "../src/app.js";

const app = await buildApp();
await app.ready();
const spec = app.swagger();
await app.close();

const collection = await new Promise((resolve, reject) => {
  converter.convert(
    { type: "json", data: spec },
    { folderStrategy: "Tags" },
    (err: Error | null, result: { result: boolean; output?: Array<{ data: unknown }>; reason?: string }) => {
      if (err) return reject(err);
      if (!result.result || !result.output) return reject(new Error(result.reason ?? "conversión falló"));
      resolve(result.output[0].data);
    },
  );
});

await writeFile("postman-collection.json", JSON.stringify(collection, null, 2));
console.log("postman-collection.json generado. Importalo en Postman con File > Import.");
