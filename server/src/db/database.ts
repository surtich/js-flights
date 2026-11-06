import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL no está configurada. Define la conexión a PostgreSQL en server/.env.",
  );
}

export const pool = new Pool({ connectionString });
