import type { PoolClient } from "pg";
import { hashPassword } from "../auth/passwords.ts";
import { pool } from "./database.ts";

export type UserRole = "USER" | "ADMIN";

export interface User {
  name: string;
  passwordHash: string;
  role: UserRole;
}

interface UserRow {
  name: string;
  password_hash: string;
  role: UserRole;
}

export async function findUserByName(name: string): Promise<User | null> {
  const result = await pool.query<UserRow>(
    `SELECT name, password_hash, role
     FROM users
     WHERE name = $1`,
    [name],
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role,
  };
}

export async function seedDefaultUsers(client: PoolClient): Promise<void> {
  const users: Array<{ name: string; password: string; role: UserRole }> = [
    { name: "user", password: "user", role: "USER" },
    { name: "admin", password: "admin", role: "ADMIN" },
  ];

  for (const user of users) {
    const passwordHash = await hashPassword(user.password);
    await client.query(
      `INSERT INTO users (name, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role`,
      [user.name, passwordHash, user.role],
    );
  }
}
