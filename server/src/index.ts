import express, { type Request, type Response } from "express";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { cities } from "./utils.ts";

export const app = express();
const port: number = Number(process.env.PORT ?? 3000);

app.get("/cities", (_request: Request, response: Response): void => {
  response.set("Access-Control-Allow-Origin", "*").json(cities);
});

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
