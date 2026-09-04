import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { db } from "./db/client.js";

migrate(db, { migrationsFolder: "./drizzle" });

const app = await buildApp();

app.listen({ port: config.port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
