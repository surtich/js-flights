import express, { type Request, type Response } from "express";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { searchCities } from "./cities-repository.ts";

export const app = express();
const port: number = Number(process.env.PORT ?? 3000);

app.get("/cities", async (request: Request, response: Response): Promise<void> => {
  response.set("Access-Control-Allow-Origin", "*");

  const search = request.query.search;
  if (typeof search !== "string" || !search.trim()) {
    response.status(400).json({
      error: "El parámetro 'search' es obligatorio y no puede estar vacío.",
    });
    return;
  }

  try {
    response.json(await searchCities(search));
  } catch (error) {
    console.error("Error al buscar ciudades en PostgreSQL:", error);
    response.status(500).json({
      error: "No se pudieron cargar las ciudades.",
    });
  }
});

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
