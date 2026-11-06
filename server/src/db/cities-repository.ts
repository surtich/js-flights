import { pool } from "./database.ts";

export interface CitySearchResults {
  cities: string[];
  total: number;
}

export interface CityListResults extends CitySearchResults {
  page: number;
  pageSize: number;
}

interface CitySearchRow {
  name: string;
  total: string;
}

interface CityCountRow {
  total: string;
}

interface CityRow {
  name: string;
}

const maxResults = 20;

export async function searchCities(query: string): Promise<CitySearchResults> {
  const result = await pool.query<CitySearchRow>(
    `SELECT name, COUNT(*) OVER() AS total
     FROM cities
     WHERE strpos(lower(name), lower($1)) > 0
     ORDER BY name
     LIMIT $2`,
    [query.trim(), maxResults],
  );

  return {
    cities: result.rows.map(({ name }) => name),
    total: Number(result.rows[0]?.total ?? 0),
  };
}

export async function listCities(page: number): Promise<CityListResults> {
  const countResult = await pool.query<CityCountRow>(
    "SELECT COUNT(*) AS total FROM cities",
  );
  const total = Number(countResult.rows[0]?.total ?? 0);
  const result = await pool.query<CityRow>(
    `SELECT name
     FROM cities
     ORDER BY name
     LIMIT $1 OFFSET $2`,
    [maxResults, (page - 1) * maxResults],
  );

  return {
    cities: result.rows.map(({ name }) => name),
    total,
    page,
    pageSize: maxResults,
  };
}

export async function createCity(name: string): Promise<string | null> {
  const result = await pool.query<CityRow>(
    `INSERT INTO cities (name)
     VALUES ($1)
     ON CONFLICT (name) DO NOTHING
     RETURNING name`,
    [name],
  );

  return result.rows[0]?.name ?? null;
}

export async function findCity(name: string): Promise<string | null> {
  const result = await pool.query<CityRow>(
    "SELECT name FROM cities WHERE name = $1",
    [name],
  );

  return result.rows[0]?.name ?? null;
}

export async function renameCity(
  currentName: string,
  newName: string,
): Promise<string | null> {
  const result = await pool.query<CityRow>(
    `UPDATE cities
     SET name = $2
     WHERE name = $1
     RETURNING name`,
    [currentName, newName],
  );

  return result.rows[0]?.name ?? null;
}

export async function deleteCity(name: string): Promise<boolean> {
  const result = await pool.query<CityRow>(
    "DELETE FROM cities WHERE name = $1 RETURNING name",
    [name],
  );

  return result.rows.length > 0;
}
