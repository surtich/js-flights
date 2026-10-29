import express from "express";
import { cities } from "../utils.js";

const app = express();
const port = process.env.PORT ?? 3000;

app.get("/cities", (_request, response) => {
  response.set("Access-Control-Allow-Origin", "*").json(cities);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
