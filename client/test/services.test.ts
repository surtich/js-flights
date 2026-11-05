import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCities } from "../src/services.ts";

const fetchMock = vi.fn();

describe("getCities", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("requests and returns cities matching the encoded query", async () => {
    const cities = ["Madrid", "Barcelona"];
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(cities), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getCities("New York")).resolves.toEqual(cities);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/cities?search=New+York",
      { signal: undefined },
    );
  });

  it("passes the abort signal to the request", async () => {
    const signal = new AbortController().signal;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(["Madrid"]), { status: 200 }),
    );

    await expect(getCities("mad", signal)).resolves.toEqual(["Madrid"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/cities?search=mad",
      { signal },
    );
  });

  it("throws when the server responds with an error", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    await expect(getCities()).rejects.toThrow(
      "No se pudieron cargar las ciudades.",
    );
  });

  it("throws when the response is not a list of strings", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(["Madrid", 42]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getCities()).rejects.toThrow(
      "La respuesta del servidor no contiene una lista de ciudades.",
    );
  });
});
