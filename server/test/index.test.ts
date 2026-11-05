import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const { mockedCities } = vi.hoisted(() => ({
  mockedCities: ["Mock City", "Testville"],
}));
const searchCitiesMock = vi.fn((query: string) =>
  mockedCities.filter((city) =>
    city.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  ),
);

vi.mock("../src/utils.ts", () => ({
  cities: mockedCities,
  searchCities: searchCitiesMock,
}));

const { app } = await import("../src/index.ts");

describe("GET /cities", () => {
  let server: Server;
  let baseUrl: string;

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
    const response = await fetch(`${baseUrl}/cities?search=mock`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    await expect(response.json()).resolves.toEqual(["Mock City"]);
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

  it("returns 404 for an unknown route", async () => {
    const response = await fetch(`${baseUrl}/unknown`);

    expect(response.status).toBe(404);
  });
});
