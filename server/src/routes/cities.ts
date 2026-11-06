import { Router, type Request, type Response } from "express";
import {
  createCity,
  deleteCity,
  findCity,
  renameCity,
  searchCities,
} from "../db/cities-repository.ts";

type CityNameParams = { name: string };

const router = Router();

router.get("/", async (request: Request, response: Response): Promise<void> => {
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

router.post("/", async (request: Request, response: Response): Promise<void> => {
  const body: unknown = request.body;
  if (!isCityInput(body)) {
    response.status(400).json({
      error: "El campo 'name' es obligatorio y no puede estar vacío.",
    });
    return;
  }

  try {
    const city = await createCity(body.name.trim());
    if (!city) {
      response.status(409).json({ error: "La ciudad ya existe." });
      return;
    }

    response.status(201).json({ name: city });
  } catch (error) {
    console.error("Error al crear ciudad en PostgreSQL:", error);
    response.status(500).json({ error: "No se pudo crear la ciudad." });
  }
});

router.get(
  "/:name",
  async (
    request: Request<CityNameParams>,
    response: Response,
  ): Promise<void> => {
    const name = request.params.name.trim();
    if (!name) {
      response
        .status(400)
        .json({ error: "El nombre de la ciudad no puede estar vacío." });
      return;
    }

    try {
      const city = await findCity(name);
      if (!city) {
        response.status(404).json({ error: "No se encontró la ciudad." });
        return;
      }

      response.json({ name: city });
    } catch (error) {
      console.error("Error al cargar ciudad desde PostgreSQL:", error);
      response.status(500).json({ error: "No se pudo cargar la ciudad." });
    }
  },
);

router.put(
  "/:name",
  async (
    request: Request<CityNameParams>,
    response: Response,
  ): Promise<void> => {
    const currentName = request.params.name.trim();
    const body: unknown = request.body;
    if (!currentName || !isCityInput(body)) {
      response.status(400).json({
        error: "El campo 'name' es obligatorio y no puede estar vacío.",
      });
      return;
    }

    try {
      const city = await renameCity(currentName, body.name.trim());
      if (!city) {
        response.status(404).json({ error: "No se encontró la ciudad." });
        return;
      }

      response.json({ name: city });
    } catch (error) {
      if (isUniqueViolation(error)) {
        response.status(409).json({
          error: "Ya existe una ciudad con ese nombre.",
        });
        return;
      }

      console.error("Error al actualizar ciudad en PostgreSQL:", error);
      response.status(500).json({ error: "No se pudo actualizar la ciudad." });
    }
  },
);

router.delete(
  "/:name",
  async (
    request: Request<CityNameParams>,
    response: Response,
  ): Promise<void> => {
    const name = request.params.name.trim();
    if (!name) {
      response
        .status(400)
        .json({ error: "El nombre de la ciudad no puede estar vacío." });
      return;
    }

    try {
      if (!(await deleteCity(name))) {
        response.status(404).json({ error: "No se encontró la ciudad." });
        return;
      }

      response.status(204).end();
    } catch (error) {
      console.error("Error al eliminar ciudad en PostgreSQL:", error);
      response.status(500).json({ error: "No se pudo eliminar la ciudad." });
    }
  },
);

function isCityInput(value: unknown): value is { name: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    value.name.trim().length > 0
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export default router;
