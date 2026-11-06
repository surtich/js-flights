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
  listCitiesMock,
  createCityMock,
  findCityMock,
  renameCityMock,
  deleteCityMock,
  findUserByNameMock,
} = vi.hoisted(() => ({
  searchCitiesMock: vi.fn(),
  listCitiesMock: vi.fn(),
  createCityMock: vi.fn(),
  findCityMock: vi.fn(),
  renameCityMock: vi.fn(),
  deleteCityMock: vi.fn(),
  findUserByNameMock: vi.fn(),
}));

process.env.AUTH_TOKEN_SECRET ??= "test-auth-token-secret-at-least-32-bytes-long";

vi.mock("../../src/db/cities-repository.ts", () => ({
  searchCities: searchCitiesMock,
  listCities: listCitiesMock,
  createCity: createCityMock,
  findCity: findCityMock,
  renameCity: renameCityMock,
  deleteCity: deleteCityMock,
}));

vi.mock("../../src/db/users-repository.ts", () => ({
  findUserByName: findUserByNameMock,
}));

const { app } = await import("../../src/index.ts");
const { createAccessToken } = await import("../../src/auth/tokens.ts");

const adminHeaders = (): HeadersInit => ({
  Authorization: `Bearer ${createAccessToken("admin")}`,
});

describe("GET /cities", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    searchCitiesMock.mockReset();
    listCitiesMock.mockReset();
    createCityMock.mockReset();
    findCityMock.mockReset();
    renameCityMock.mockReset();
    deleteCityMock.mockReset();
    findUserByNameMock.mockImplementation(async (name: string) => ({
      name,
      passwordHash: "unused-in-these-tests",
      role: name === "user" ? "USER" : "ADMIN",
    }));
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

  it("lists a page of cities when search is not requested", async () => {
    listCitiesMock.mockResolvedValue({
      cities: ["Madrid"],
      total: 21,
      page: 2,
      pageSize: 20,
    });

    const response = await fetch(`${baseUrl}/cities?page=2`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      cities: ["Madrid"],
      total: 21,
      page: 2,
      pageSize: 20,
    });
    expect(listCitiesMock).toHaveBeenCalledWith(2);
  });

  it("defaults the city list to its first page", async () => {
    listCitiesMock.mockResolvedValue({
      cities: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    const response = await fetch(`${baseUrl}/cities`);

    expect(response.status).toBe(200);
    expect(listCitiesMock).toHaveBeenCalledWith(1);
  });

  it("rejects an invalid city list page", async () => {
    const response = await fetch(`${baseUrl}/cities?page=0`);

    expect(response.status).toBe(400);
    expect(listCitiesMock).not.toHaveBeenCalled();
  });

  it.each(["", "   "])(
    "rejects a blank search query (%j)",
    async (search) => {
      const response = await fetch(
        `${baseUrl}/cities?search=${encodeURIComponent(search)}`,
      );

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
      headers: { "Content-Type": "application/json", ...adminHeaders() },
      body: JSON.stringify({ name: " Madrid " }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ name: "Madrid" });
    expect(createCityMock).toHaveBeenCalledWith("Madrid");
  });

  it("rejects a city without a non-blank name", async () => {
    const response = await fetch(`${baseUrl}/cities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...adminHeaders() },
      body: JSON.stringify({ name: "  " }),
    });

    expect(response.status).toBe(400);
    expect(createCityMock).not.toHaveBeenCalled();
  });

  it("rejects creating an existing city", async () => {
    createCityMock.mockResolvedValue(null);

    const response = await fetch(`${baseUrl}/cities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...adminHeaders() },
      body: JSON.stringify({ name: "Madrid" }),
    });
    expect(response.status).toBe(409);
  });

  it("requires authentication and the ADMIN role to create a city", async () => {
    const unauthenticated = await fetch(`${baseUrl}/cities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Madrid" }),
    });
    expect(unauthenticated.status).toBe(401);
    expect(createCityMock).not.toHaveBeenCalled();

    const userResponse = await fetch(`${baseUrl}/cities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${createAccessToken("user")}`,
      },
      body: JSON.stringify({ name: "Madrid" }),
    });
    expect(userResponse.status).toBe(403);
    expect(createCityMock).not.toHaveBeenCalled();
  });

  it("requires an ADMIN token to rename or delete a city", async () => {
    const renameResponse = await fetch(`${baseUrl}/cities/Madrid`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Barcelona" }),
    });
    const deleteResponse = await fetch(`${baseUrl}/cities/Madrid`, {
      method: "DELETE",
    });

    expect(renameResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
    expect(renameCityMock).not.toHaveBeenCalled();
    expect(deleteCityMock).not.toHaveBeenCalled();
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
      headers: { "Content-Type": "application/json", ...adminHeaders() },
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
      headers: { "Content-Type": "application/json", ...adminHeaders() },
      body: JSON.stringify({ name: "Barcelona" }),
    });

    expect(response.status).toBe(409);
  });

  it("deletes a city", async () => {
    deleteCityMock.mockResolvedValue(true);

    const response = await fetch(`${baseUrl}/cities/Madrid`, {
      method: "DELETE",
      headers: adminHeaders(),
    });

    expect(response.status).toBe(204);
    expect(deleteCityMock).toHaveBeenCalledWith("Madrid");
  });

  it("returns 404 when deleting a missing city", async () => {
    deleteCityMock.mockResolvedValue(false);

    const response = await fetch(`${baseUrl}/cities/Madrid`, {
      method: "DELETE",
      headers: adminHeaders(),
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
