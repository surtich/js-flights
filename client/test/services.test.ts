import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchCities } from "../src/services.ts";

const fetchMock = vi.fn();

describe("searchCities", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
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
