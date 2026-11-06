import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "./database.ts";

const schemaPath = fileURLToPath(new URL("../db/schema.sql", import.meta.url));

try {
  const schema = await readFile(schemaPath, "utf8");
  await pool.query("BEGIN");
  await pool.query(schema);
  await pool.query("TRUNCATE TABLE cities");
  await pool.query("COMMIT");
  console.log("Esquema de base de datos aplicado.");
} catch (error) {
  try {
    await pool.query("ROLLBACK");
  } catch (rollbackError) {
    console.error("No se pudo revertir la migración:", rollbackError);
  }
  throw error;
} finally {
  await pool.end();
}
