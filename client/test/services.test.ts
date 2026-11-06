import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCity,
  deleteCity,
  listCities,
  searchCities,
  updateCity,
} from "../src/services.ts";

const fetchMock = vi.fn();

describe("searchCities", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  describe("city CRUD services", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.clearAllMocks();
    });

    it("creates a city with a JSON request", async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ name: "Madrid" }), { status: 201 }),
      );

      await expect(createCity("Madrid")).resolves.toEqual({ name: "Madrid" });
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Madrid" }),
      });
    });

    it("updates and deletes a city using an encoded name", async () => {
      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ name: "New York" }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 204 }));

      await expect(updateCity("San Diego", "New York")).resolves.toEqual({
        name: "New York",
      });
      await expect(deleteCity("San Diego")).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "http://localhost:3000/cities/San%20Diego",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "New York" }),
        },
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "http://localhost:3000/cities/San%20Diego",
        { method: "DELETE" },
      );
    });

    it("reports a duplicate city response", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 409 }));

      await expect(createCity("Madrid")).rejects.toThrow(
        "Ya existe una ciudad con ese nombre.",
      );
    });

    it("loads a paginated city list", async () => {
      const result = {
        cities: ["Madrid"],
        total: 21,
        page: 2,
        pageSize: 20,
      };
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(result), { status: 200 }),
      );

      await expect(listCities(2)).resolves.toEqual(result);
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3000/cities?page=2",
      );
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("requests and returns matching cities and total count", async () => {
    const results = { cities: ["Madrid", "Barcelona"], total: 2 };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(results), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(searchCities("New York")).resolves.toEqual(results);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/cities?search=New+York",
      { signal: undefined },
    );
  });

  it("passes the abort signal to the request", async () => {
    const signal = new AbortController().signal;
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ cities: ["Madrid"], total: 1 }),
        { status: 200 },
      ),
    );

    await expect(searchCities("mad", signal)).resolves.toEqual({
      cities: ["Madrid"],
      total: 1,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/cities?search=mad",
      { signal },
    );
  });

  it("throws when the server responds with an error", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    await expect(searchCities("mad")).rejects.toThrow(
      "No se pudieron cargar las ciudades.",
    );
  });

  it("throws when the response does not contain valid search results", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ cities: ["Madrid", 42], total: 2 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(searchCities("mad")).rejects.toThrow(
      "La respuesta del servidor no contiene resultados válidos.",
    );
  });

  it("throws when the reported total is invalid", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ cities: ["Madrid"], total: 0 }), {
        status: 200,
      }),
    );

    await expect(searchCities("mad")).rejects.toThrow(
      "La respuesta del servidor no contiene resultados válidos.",
    );
  });
});
