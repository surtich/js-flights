import type { PoolClient } from "pg";
import { pool } from "./database.ts";
import { cities } from "./utils.ts";

const batchSize = 500;

async function insertCities(client: PoolClient): Promise<number> {
  let inserted = 0;

  for (let start = 0; start < cities.length; start += batchSize) {
    const batch = cities.slice(start, start + batchSize);
    const values = batch.map((_, index) => `($${index + 1})`).join(", ");
    const result = await client.query(
      `INSERT INTO cities (name)
       VALUES ${values}
       ON CONFLICT (name) DO NOTHING`,
      batch,
    );
    inserted += result.rowCount ?? 0;
  }

  return inserted;
}

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const inserted = await insertCities(client);
  await client.query("COMMIT");
  console.log(`Se insertaron ${inserted} ciudades nuevas (${cities.length} en origen).`);
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    console.error("No se pudo revertir la importación de ciudades:", rollbackError);
  }
  throw error;
} finally {
  client.release();
  await pool.end();
}
