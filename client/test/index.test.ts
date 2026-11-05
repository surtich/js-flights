// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  });

  it("suggests cities containing the query and updates selection status", async () => {
    getCitiesMock.mockResolvedValue([
      "Madrid",
      "Barcelona",
      "Villa Madrid",
      "San Diego",
    ]);

    await import("../src/index.ts");

    const originCitySearch = document.querySelector<HTMLInputElement>(
      "#origin-city-search",
    );
    const originCitySuggestions = document.querySelector<HTMLUListElement>(
      "#origin-city-suggestions",
    );
    const destinationCitySearch = document.querySelector<HTMLInputElement>(
      "#destination-city-search",
    );
    const status = document.querySelector<HTMLParagraphElement>("#status");

    expect(getCitiesMock).toHaveBeenCalledTimes(1);
    expect(originCitySearch?.disabled).toBe(false);
    expect(destinationCitySearch?.disabled).toBe(false);
    expect(status?.textContent).toBe("4 ciudades disponibles");

    originCitySearch!.value = "DRID";
    originCitySearch!.dispatchEvent(new Event("input"));
    expect(
      Array.from(originCitySuggestions!.children).map((option) => option.textContent),
    ).toEqual(["Madrid", "Villa Madrid"]);
    expect(status?.textContent).toBe("4 ciudades disponibles");

    originCitySuggestions!.children[0]!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(status?.textContent).toBe("Origen: Madrid");

    destinationCitySearch!.value = "die";
    destinationCitySearch!.dispatchEvent(new Event("input"));
    const destinationCitySuggestions = document.querySelector<HTMLUListElement>(
      "#destination-city-suggestions",
    );
    expect(
      Array.from(destinationCitySuggestions!.children).map(
        (option) => option.textContent,
      ),
    ).toEqual(["San Diego"]);
    destinationCitySuggestions!.children[0]!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(status?.textContent).toBe("Origen: Madrid · Destino: San Diego");

    originCitySearch!.value = "not a city";
    originCitySearch!.dispatchEvent(new Event("input"));
    expect(status?.textContent).toBe("Destino: San Diego");
    expect(
      document.querySelector("#origin-city-summary")?.textContent,
    ).toBe("No se encontraron ciudades.");
  });

  it("limits the number of rendered suggestions", async () => {
    getCitiesMock.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) => `City ${index}`),
    );

    await import("../src/index.ts");

    const originCitySearch = document.querySelector<HTMLInputElement>(
      "#origin-city-search",
    )!;
    const suggestions = document.querySelector<HTMLUListElement>(
      "#origin-city-suggestions",
    )!;

    originCitySearch.value = "city";
    originCitySearch.dispatchEvent(new Event("input"));

    expect(suggestions.children).toHaveLength(20);
    expect(
      document.querySelector("#origin-city-summary")?.textContent,
    ).toBe(
      "Hay 25 coincidencias; usa las flechas o desplázate para ver las primeras 20.",
    );
  });

  it("supports choosing a suggestion with the keyboard", async () => {
    getCitiesMock.mockResolvedValue(["Madrid", "Barcelona"]);

    await import("../src/index.ts");

    const originCitySearch = document.querySelector<HTMLInputElement>(
      "#origin-city-search",
    )!;
    const suggestions = document.querySelector<HTMLUListElement>(
      "#origin-city-suggestions",
    )!;

    originCitySearch.value = "mad";
    originCitySearch.dispatchEvent(new Event("input"));
    originCitySearch.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );

    expect(originCitySearch.getAttribute("aria-activedescendant")).toBe(
      suggestions.children[0]?.id,
    );
    originCitySearch.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(originCitySearch.value).toBe("Madrid");
    expect(suggestions.hidden).toBe(true);
    expect(document.querySelector("#status")?.textContent).toBe(
      "Origen: Madrid",
    );
  });

  it("displays an error state when loading cities fails", async () => {
    getCitiesMock.mockRejectedValue(new Error("network error"));

    await import("../src/index.ts");

    const originCitySearch = document.querySelector<HTMLInputElement>(
      "#origin-city-search",
    );
    const destinationCitySearch = document.querySelector<HTMLInputElement>(
      "#destination-city-search",
    );
    const status = document.querySelector<HTMLParagraphElement>("#status");

    expect(originCitySearch?.disabled).toBe(true);
    expect(destinationCitySearch?.disabled).toBe(true);
    expect(originCitySearch?.placeholder).toBe(
      "No se pudieron cargar las ciudades",
    );
    expect(destinationCitySearch?.placeholder).toBe(
      "No se pudieron cargar las ciudades",
    );
    expect(status?.textContent).toBe("Comprueba que el servidor esté activo.");
  });
});
