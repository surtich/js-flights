import express, { type Request, type Response } from "express";
import { cities } from "./utils.ts";

const app = express();
const port: number = Number(process.env.PORT ?? 3000);

app.get("/cities", (_request: Request, response: Response): void => {
  response.set("Access-Control-Allow-Origin", "*").json(cities);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
