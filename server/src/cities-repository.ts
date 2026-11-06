import { pool } from "./database.ts";

export interface CitySearchResults {
  cities: string[];
  total: number;
}

interface CitySearchRow {
  name: string;
  total: string;
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
