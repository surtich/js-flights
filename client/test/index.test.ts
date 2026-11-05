// @vitest-environment jsdom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { getCitiesMock } = vi.hoisted(() => ({
  getCitiesMock: vi.fn(),
}));

vi.mock("../src/services.js", () => ({
  getCities: getCitiesMock,
}));

describe("index UI", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = `
      <div id="origin-city-field"></div>
      <div id="destination-city-field"></div>
      <p id="status"></p>
    `;
    getCitiesMock.mockReset();
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("requests matching cities and updates selection status", async () => {
    const cities = ["Madrid", "Barcelona", "Villa Madrid", "San Diego"];
    getCitiesMock.mockImplementation(async (query: string) =>
      cities.filter((city) =>
        city.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    );

    await import("../src/index.ts");

    const originCitySearch = document.querySelector<HTMLInputElement>(
      "#origin-city-search",
    )!;
    const originCitySuggestions = document.querySelector<HTMLUListElement>(
      "#origin-city-suggestions",
    )!;
    const destinationCitySearch = document.querySelector<HTMLInputElement>(
      "#destination-city-search",
    )!;
    const destinationCitySuggestions = document.querySelector<HTMLUListElement>(
      "#destination-city-suggestions",
    )!;
    const status = document.querySelector<HTMLParagraphElement>("#status")!;

    expect(getCitiesMock).not.toHaveBeenCalled();
    expect(originCitySearch.disabled).toBe(false);
    expect(destinationCitySearch.disabled).toBe(false);
    expect(status.textContent).toBe("Busca una ciudad de origen y destino.");

    originCitySearch.value = "DRID";
    originCitySearch.dispatchEvent(new Event("input"));
    await vi.waitFor(() =>
      expect(
        Array.from(originCitySuggestions.children).map(
          (option) => option.textContent,
        ),
      ).toEqual(["Madrid", "Villa Madrid"]),
    );
    expect(getCitiesMock).toHaveBeenLastCalledWith(
      "DRID",
      expect.any(AbortSignal),
    );

    originCitySuggestions.children[0]!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(status.textContent).toBe("Origen: Madrid");

    destinationCitySearch.value = "die";
    destinationCitySearch.dispatchEvent(new Event("input"));
    await vi.waitFor(() =>
      expect(
        Array.from(destinationCitySuggestions.children).map(
          (option) => option.textContent,
        ),
      ).toEqual(["San Diego"]),
    );
    destinationCitySuggestions.children[0]!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(status.textContent).toBe("Origen: Madrid · Destino: San Diego");

    originCitySearch.value = "not a city";
    originCitySearch.dispatchEvent(new Event("input"));
    await vi.waitFor(() =>
      expect(
        document.querySelector("#origin-city-summary")?.textContent,
      ).toBe("No se encontraron ciudades."),
    );
    expect(status.textContent).toBe("Destino: San Diego");
  });

  it("limits the rendered suggestions and reports the total matches", async () => {
    getCitiesMock.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) => `City ${index}`),
    );

    await import("../src/index.ts");

    const search = document.querySelector<HTMLInputElement>(
      "#origin-city-search",
    )!;
    const suggestions = document.querySelector<HTMLUListElement>(
      "#origin-city-suggestions",
    )!;

    search.value = "city";
    search.dispatchEvent(new Event("input"));

    await vi.waitFor(() => expect(suggestions.children).toHaveLength(20));
    expect(document.querySelector("#origin-city-summary")?.textContent).toBe(
      "Hay 25 coincidencias; usa las flechas o desplázate para ver las primeras 20.",
    );
  });

  it("supports choosing a server suggestion with the keyboard", async () => {
    getCitiesMock.mockResolvedValue(["Madrid", "Barcelona"]);

    await import("../src/index.ts");

    const search = document.querySelector<HTMLInputElement>(
      "#origin-city-search",
    )!;
    const suggestions = document.querySelector<HTMLUListElement>(
      "#origin-city-suggestions",
    )!;

    search.value = "mad";
    search.dispatchEvent(new Event("input"));
    await vi.waitFor(() => expect(suggestions.children).toHaveLength(2));
    search.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );

    expect(search.getAttribute("aria-activedescendant")).toBe(
      suggestions.children[0]?.id,
    );
    search.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(search.value).toBe("Madrid");
    expect(suggestions.hidden).toBe(true);
    expect(document.querySelector("#status")?.textContent).toBe("Origen: Madrid");
  });

  it("shows a visible error when a city search request fails", async () => {
    getCitiesMock.mockRejectedValue(new Error("network error"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await import("../src/index.ts");

    const search = document.querySelector<HTMLInputElement>(
      "#origin-city-search",
    )!;
    search.value = "madrid";
    search.dispatchEvent(new Event("input"));

    await vi.waitFor(() =>
      expect(
        document.querySelector("#origin-city-summary")?.textContent,
      ).toBe("No se pudieron cargar las sugerencias. Inténtalo de nuevo."),
    );
    expect(search.disabled).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it("ignores stale responses when the query changes", async () => {
    let resolveFirst: (cities: string[]) => void = () => {};
    getCitiesMock
      .mockImplementationOnce(
        () =>
          new Promise<string[]>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(["Madrid"]);

    await import("../src/index.ts");

    const search = document.querySelector<HTMLInputElement>(
      "#origin-city-search",
    )!;
    const suggestions = document.querySelector<HTMLUListElement>(
      "#origin-city-suggestions",
    )!;

    search.value = "ma";
    search.dispatchEvent(new Event("input"));
    search.value = "madrid";
    search.dispatchEvent(new Event("input"));

    await vi.waitFor(() => expect(suggestions.children).toHaveLength(1));
    resolveFirst(["Malaga"]);
    await Promise.resolve();

    expect(Array.from(suggestions.children).map((option) => option.textContent))
      .toEqual(["Madrid"]);
  });
});
