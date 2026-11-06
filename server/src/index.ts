import express from "express";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import citiesRouter from "./routes/cities.ts";

export const app = express();
const port: number = Number(process.env.PORT ?? 3000);

app.use((request, response, next) => {
  response.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  next();
});
app.use(express.json());
app.use("/cities", citiesRouter);

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
