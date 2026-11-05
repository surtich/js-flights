import express, { type Request, type Response } from "express";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { searchCities } from "./utils.ts";

export const app = express();
const port: number = Number(process.env.PORT ?? 3000);

app.get("/cities", (request: Request, response: Response): void => {
  response.set("Access-Control-Allow-Origin", "*");

  const search = request.query.search;
  if (typeof search !== "string" || !search.trim()) {
    response.status(400).json({
      error: "El parámetro 'search' es obligatorio y no puede estar vacío.",
    });
    return;
  }

  response.json(searchCities(search));
});

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
