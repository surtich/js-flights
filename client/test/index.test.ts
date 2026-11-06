// @vitest-environment jsdom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  searchCitiesMock,
  listCitiesMock,
  createCityMock,
  updateCityMock,
  deleteCityMock,
} = vi.hoisted(() => ({
  searchCitiesMock: vi.fn(),
  listCitiesMock: vi.fn(),
  createCityMock: vi.fn(),
  updateCityMock: vi.fn(),
  deleteCityMock: vi.fn(),
}));

vi.mock("../src/services.js", () => ({
  searchCities: searchCitiesMock,
  listCities: listCitiesMock,
  createCity: createCityMock,
  updateCity: updateCityMock,
  deleteCity: deleteCityMock,
}));

describe("index UI", () => {
  beforeEach(() => {
    vi.resetModules();
    const header = document.createElement("header");
    header.className = "site-header";
    const navigation = document.createElement("nav");
    for (const [label, href] of [
      ["Inicio", "#/"],
      ["Ciudades", "#/cities"],
      ["Buscar vuelos", "#/flights"],
    ]) {
      const link = document.createElement("a");
      link.textContent = label;
      link.href = href;
      link.dataset.route = "";
      navigation.append(link);
    }
    header.append(navigation);
    const page = document.createElement("main");
    page.id = "page-content";
    document.body.replaceChildren(header, page);
    searchCitiesMock.mockReset();
    listCitiesMock.mockReset();
    listCitiesMock.mockResolvedValue({
      cities: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    createCityMock.mockReset();
    updateCityMock.mockReset();
    deleteCityMock.mockReset();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  async function openFlightsSearch(): Promise<void> {
    window.history.replaceState(null, "", "/#/flights");
    await import("../src/index.ts");
    await vi.waitFor(() =>
      expect(document.querySelector("#status")).not.toBeNull(),
    );
  }

  async function openCityAdmin(): Promise<void> {
    window.history.replaceState(null, "", "/#/cities");
    await import("../src/index.ts");
    await vi.waitFor(() =>
      expect(document.querySelector("#create-city-form")).not.toBeNull(),
    );
  }

  it("shows a home menu that links to cities and flight search", async () => {
    await import("../src/index.ts");

    expect(document.querySelector("h1")?.textContent).toBe("¿A dónde quieres volar?");
    expect(document.querySelector('a[href="#/cities"]')?.textContent).toContain(
      "Ciudades",
    );
    expect(document.querySelector('a[href="#/flights"]')?.textContent).toContain(
      "Buscar vuelos",
    );
  });

  it("requests matching cities and updates selection status", async () => {
    const cities = ["Madrid", "Barcelona", "Villa Madrid", "San Diego"];
    searchCitiesMock.mockImplementation(async (query: string) => {
      const matches = cities.filter((city) =>
        city.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      );
      return { cities: matches, total: matches.length };
    });

    await openFlightsSearch();

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

    expect(searchCitiesMock).not.toHaveBeenCalled();
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
    expect(searchCitiesMock).toHaveBeenLastCalledWith(
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
    searchCitiesMock.mockResolvedValue({
      cities: Array.from({ length: 20 }, (_, index) => `City ${index}`),
      total: 25,
    });

    await openFlightsSearch();

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
    searchCitiesMock.mockResolvedValue({
      cities: ["Madrid", "Barcelona"],
      total: 2,
    });

    await openFlightsSearch();

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
    searchCitiesMock.mockRejectedValue(new Error("network error"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await openFlightsSearch();

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
    searchCitiesMock
      .mockImplementationOnce(
        () =>
          new Promise<{ cities: string[]; total: number }>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ cities: ["Madrid"], total: 1 });

    await openFlightsSearch();

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
    resolveFirst({ cities: ["Malaga"], total: 1 });
    await Promise.resolve();

    expect(Array.from(suggestions.children).map((option) => option.textContent))
      .toEqual(["Madrid"]);
  });

  it("creates, searches, renames, and deletes cities from the admin page", async () => {
    createCityMock.mockResolvedValue({ name: "Madrid" });
    updateCityMock.mockResolvedValue({ name: "Barcelona" });
    deleteCityMock.mockResolvedValue(undefined);
    listCitiesMock
      .mockResolvedValueOnce({ cities: [], total: 0, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({
        cities: ["Madrid"],
        total: 1,
        page: 1,
        pageSize: 20,
      })
      .mockResolvedValueOnce({
        cities: ["Barcelona"],
        total: 1,
        page: 1,
        pageSize: 20,
      })
      .mockResolvedValueOnce({ cities: [], total: 0, page: 1, pageSize: 20 });
    await openCityAdmin();

    const newCityName = document.querySelector<HTMLInputElement>("#new-city-name")!;
    newCityName.value = " Madrid ";
    document.querySelector<HTMLFormElement>("#create-city-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(document.querySelector(".city-result")?.textContent).toContain(
        "Madrid",
      ),
    );
    expect(createCityMock).toHaveBeenCalledWith("Madrid");

    document.querySelector<HTMLButtonElement>(".city-result button")!.click();
    const editInput = document.querySelector<HTMLInputElement>(
      ".edit-city-form input",
    )!;
    editInput.value = " Barcelona ";
    document.querySelector<HTMLFormElement>(".edit-city-form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(document.querySelector(".city-result")?.textContent).toContain(
        "Barcelona",
      ),
    );
    expect(updateCityMock).toHaveBeenCalledWith("Madrid", "Barcelona");

    document.querySelector<HTMLButtonElement>(".city-result .danger")!.click();
    await vi.waitFor(() =>
      expect(document.querySelector(".city-result")).toBeNull(),
    );
    expect(deleteCityMock).toHaveBeenCalledWith("Barcelona");
  });

  it("paginates through the full city list", async () => {
    listCitiesMock
      .mockResolvedValueOnce({
        cities: Array.from({ length: 20 }, (_, index) => `City ${index}`),
        total: 21,
        page: 1,
        pageSize: 20,
      })
      .mockResolvedValueOnce({
        cities: ["Last City"],
        total: 21,
        page: 2,
        pageSize: 20,
      });

    await openCityAdmin();
    await vi.waitFor(() =>
      expect(document.querySelectorAll(".city-result")).toHaveLength(20),
    );
    expect(document.querySelector(".page-indicator")?.textContent).toBe(
      "Página 1 de 2",
    );

    document.querySelector<HTMLButtonElement>(".city-pagination button:last-child")!.click();
    await vi.waitFor(() =>
      expect(document.querySelector(".city-result")?.textContent).toContain(
        "Last City",
      ),
    );
    expect(listCitiesMock).toHaveBeenLastCalledWith(2);
  });
});
