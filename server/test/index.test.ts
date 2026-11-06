import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const {
  searchCitiesMock,
  createCityMock,
  findCityMock,
  renameCityMock,
  deleteCityMock,
} = vi.hoisted(() => ({
  searchCitiesMock: vi.fn(),
  createCityMock: vi.fn(),
  findCityMock: vi.fn(),
  renameCityMock: vi.fn(),
  deleteCityMock: vi.fn(),
}));

vi.mock("../src/db/cities-repository.ts", () => ({
  searchCities: searchCitiesMock,
  createCity: createCityMock,
  findCity: findCityMock,
  renameCity: renameCityMock,
  deleteCity: deleteCityMock,
}));

const { app } = await import("../src/index.ts");

describe("GET /cities", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    searchCitiesMock.mockReset();
    createCityMock.mockReset();
    findCityMock.mockReset();
    renameCityMock.mockReset();
    deleteCityMock.mockReset();
  });

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("returns only cities matching the search with JSON content type and open CORS", async () => {
    searchCitiesMock.mockResolvedValue({
      cities: ["Mock City"],
      total: 1,
    });
    const response = await fetch(`${baseUrl}/cities?search=mock`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    await expect(response.json()).resolves.toEqual({
      cities: ["Mock City"],
      total: 1,
    });
    expect(searchCitiesMock).toHaveBeenCalledWith("mock");
  });

  it.each(["", "   "])(
    "rejects a missing or blank search query (%j)",
    async (search) => {
      const url = search
        ? `${baseUrl}/cities?search=${encodeURIComponent(search)}`
        : `${baseUrl}/cities`;
      const response = await fetch(url);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "El parámetro 'search' es obligatorio y no puede estar vacío.",
      });
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
    },
  );

  it("rejects a repeated search query", async () => {
    const response = await fetch(
      `${baseUrl}/cities?search=mock&search=city`,
    );

    expect(response.status).toBe(400);
  });

  it("reports database failures as a server error", async () => {
    searchCitiesMock.mockRejectedValue(new Error("database unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await fetch(`${baseUrl}/cities?search=mock`);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "No se pudieron cargar las ciudades.",
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("returns 404 for an unknown route", async () => {
    const response = await fetch(`${baseUrl}/unknown`);

    expect(response.status).toBe(404);
  });

  it("creates a city and trims its name", async () => {
    createCityMock.mockResolvedValue("Madrid");

    const response = await fetch(`${baseUrl}/cities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: " Madrid " }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ name: "Madrid" });
    expect(createCityMock).toHaveBeenCalledWith("Madrid");
  });

  it("rejects a city without a non-blank name", async () => {
    const response = await fetch(`${baseUrl}/cities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  " }),
    });

    expect(response.status).toBe(400);
    expect(createCityMock).not.toHaveBeenCalled();
  });

  it("rejects creating an existing city", async () => {
    createCityMock.mockResolvedValue(null);

    const response = await fetch(`${baseUrl}/cities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Madrid" }),
    });

    expect(response.status).toBe(409);
  });

  it("returns a city by name", async () => {
    findCityMock.mockResolvedValue("Madrid");

    const response = await fetch(`${baseUrl}/cities/Madrid`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ name: "Madrid" });
    expect(findCityMock).toHaveBeenCalledWith("Madrid");
  });

  it("returns 404 when reading a missing city", async () => {
    findCityMock.mockResolvedValue(null);

    const response = await fetch(`${baseUrl}/cities/Madrid`);

    expect(response.status).toBe(404);
  });

  it("renames a city", async () => {
    renameCityMock.mockResolvedValue("Barcelona");

    const response = await fetch(`${baseUrl}/cities/Madrid`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: " Barcelona " }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ name: "Barcelona" });
    expect(renameCityMock).toHaveBeenCalledWith("Madrid", "Barcelona");
  });

  it("rejects renaming a city to an existing name", async () => {
    const duplicateError = Object.assign(new Error("duplicate"), {
      code: "23505",
    });
    renameCityMock.mockRejectedValue(duplicateError);

    const response = await fetch(`${baseUrl}/cities/Madrid`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Barcelona" }),
    });

    expect(response.status).toBe(409);
  });

  it("deletes a city", async () => {
    deleteCityMock.mockResolvedValue(true);

    const response = await fetch(`${baseUrl}/cities/Madrid`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(deleteCityMock).toHaveBeenCalledWith("Madrid");
  });

  it("returns 404 when deleting a missing city", async () => {
    deleteCityMock.mockResolvedValue(false);

    const response = await fetch(`${baseUrl}/cities/Madrid`, {
      method: "DELETE",
    });

    expect(response.status).toBe(404);
  });

  it("answers CORS preflight requests for CRUD methods", async () => {
    const response = await fetch(`${baseUrl}/cities`, {
      method: "OPTIONS",
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toContain("DELETE");
  });
});
