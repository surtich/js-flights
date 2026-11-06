import { expect, test } from "@playwright/test";

const seedCities = [
  "Anchor Point",
  "Harvest",
  ...Array.from({ length: 28 }, (_, index) => `Mad City ${index}`),
];

async function mockApi(page) {
  let cities = [...seedCities];

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:4173") {
      await route.continue();
      return;
    }

    if (url.origin !== "http://localhost:3000" || !url.pathname.startsWith("/cities")) {
      await route.abort();
      return;
    }

    const request = route.request();
    const method = request.method();
    if (url.pathname === "/cities" && method === "GET") {
      const query = url.searchParams.get("search");
      if (query !== null) {
        const matches = cities.filter((city) =>
          city.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
        );
        await route.fulfill({
          json: { cities: matches.slice(0, 20), total: matches.length },
        });
      } else {
        const page = Number(url.searchParams.get("page") ?? 1);
        const sortedCities = [...cities].sort((left, right) =>
          left.localeCompare(right),
        );
        await route.fulfill({
          json: {
            cities: sortedCities.slice((page - 1) * 20, page * 20),
            total: sortedCities.length,
            page,
            pageSize: 20,
          },
        });
      }
      return;
    }

    if (url.pathname === "/cities" && method === "POST") {
      const { name } = request.postDataJSON();
      if (cities.includes(name)) {
        await route.fulfill({ status: 409, json: { error: "duplicate" } });
        return;
      }
      cities.push(name);
      await route.fulfill({ status: 201, json: { name } });
      return;
    }

    const cityName = decodeURIComponent(url.pathname.slice("/cities/".length));
    if (method === "PUT") {
      const { name } = request.postDataJSON();
      if (!cities.includes(cityName)) {
        await route.fulfill({ status: 404, json: { error: "missing" } });
        return;
      }
      if (cities.includes(name) && name !== cityName) {
        await route.fulfill({ status: 409, json: { error: "duplicate" } });
        return;
      }
      cities = cities.map((city) => (city === cityName ? name : city));
      await route.fulfill({ json: { name } });
      return;
    }

    if (method === "DELETE") {
      if (!cities.includes(cityName)) {
        await route.fulfill({ status: 404, json: { error: "missing" } });
        return;
      }
      cities = cities.filter((city) => city !== cityName);
      await route.fulfill({ status: 204 });
      return;
    }

    await route.fulfill({ status: 404, json: { error: "unknown endpoint" } });
  });
}

test.beforeEach(async ({ page }) => mockApi(page));

async function openFlightSearch(page) {
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", {
    name: "Buscar vuelos",
  }).click();
  await expect(page.getByRole("heading", { name: "Busca tu próximo vuelo" }))
    .toBeVisible();
}

test("suggests cities containing the query and updates their status", async ({ page }) => {
  const citiesRequests = [];
  page.on("request", (request) => {
    if (request.url().startsWith("http://localhost:3000/cities?")) {
      citiesRequests.push(request.url());
    }
  });

  await openFlightSearch(page);

  const originCitySearch = page.locator("#origin-city-search");
  const destinationCitySearch = page.locator("#destination-city-search");
  const status = page.locator("#status");

  await expect(originCitySearch).toBeEnabled();
  await expect(destinationCitySearch).toBeEnabled();
  await expect(status).toHaveText("Busca una ciudad de origen y destino.");
  expect(citiesRequests).toHaveLength(0);

  await originCitySearch.fill("point");
  await expect(
    page.locator("#origin-city-suggestions [role=option]").filter({
      hasText: "Anchor Point",
    }),
  ).toHaveCount(1);
  await expect.poll(() => citiesRequests.length).toBe(1);
  expect(new URL(citiesRequests[0]).searchParams.get("search")).toBe("point");

  await originCitySearch.fill("nch");
  await expect(
    page.locator("#origin-city-suggestions [role=option]").filter({
      hasText: "Anchor Point",
    }),
  ).toHaveCount(1);
  await expect.poll(() => citiesRequests.length).toBe(2);
  expect(new URL(citiesRequests[1]).searchParams.get("search")).toBe("nch");
  await page.getByRole("option", { name: "Anchor Point" }).click();

  await destinationCitySearch.fill("vest");
  await expect(
    page.locator("#destination-city-suggestions [role=option]").filter({
      hasText: "Harvest",
    }),
  ).toHaveCount(1);

  await expect(status).toHaveText("Origen: Anchor Point");

  await page.getByRole("option", { name: "Harvest" }).click();
  await expect(status).toHaveText("Origen: Anchor Point · Destino: Harvest");

  await originCitySearch.fill("no-city-matches-this");
  await expect(status).toHaveText("Destino: Harvest");
  await destinationCitySearch.fill("");
  await expect(status).toHaveText("Busca una ciudad de origen y destino.");
});

test("shows an error when the cities request fails", async ({ page }) => {
  await page.route(/\/cities(?:\?.*)?$/, (route) => route.abort());

  await openFlightSearch(page);

  const search = page.locator("#origin-city-search");
  await search.fill("madrid");
  await expect(page.locator("#origin-city-summary")).toHaveText(
    "No se pudieron cargar las sugerencias. Inténtalo de nuevo.",
  );
  await expect(search).toBeEnabled();
});

test("keeps keyboard navigation moving through the scrollable suggestions", async ({ page }) => {
  await openFlightSearch(page);

  const search = page.locator("#origin-city-search");
  const suggestions = page.locator("#origin-city-suggestions");

  await search.fill("Mad");
  await expect(page.locator("#origin-city-summary")).toHaveText(
    "Hay 28 coincidencias; usa las flechas o desplázate para ver las primeras 20.",
  );

  for (let index = 0; index < 12; index += 1) {
    await search.press("ArrowDown");
  }

  const activeOption = suggestions.locator('[aria-selected="true"]');
  await expect(activeOption).toHaveCount(1);
  await expect(search).toHaveAttribute(
    "aria-activedescendant",
    await activeOption.getAttribute("id"),
  );
  expect(await suggestions.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  await search.press("ArrowUp");
  await expect(suggestions.locator('[aria-selected="true"]')).toHaveAttribute(
    "id",
    "origin-city-suggestions-option-10",
  );
});

test("navigates to city administration and completes CRUD without a database", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "¿A dónde quieres volar?" }))
    .toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "Ciudades" }).click();

  await expect(page.getByText("Página 1 de 2")).toBeVisible();
  await page.getByLabel("Añadir ciudad").fill("Aardvark City");
  await page.getByRole("button", { name: "Crear" }).click();
  const cityResult = page.locator(".city-result").filter({
    hasText: "Aardvark City",
  });
  await expect(cityResult).toBeVisible();

  await cityResult.getByRole("button", { name: "Modificar" }).click();
  await page.getByRole("textbox", { name: "Nuevo nombre para Aardvark City" })
    .fill("Aardvark Town");
  await page.getByRole("button", { name: "Guardar" }).click();
  const updatedResult = page.locator(".city-result").filter({
    hasText: "Aardvark Town",
  });
  await expect(updatedResult).toBeVisible();

  await updatedResult.getByRole("button", { name: "Borrar" }).click();
  await expect(page.locator(".city-result")).toHaveCount(20);
  await expect(page.getByRole("status")).toHaveText(
    "Se eliminó la ciudad Aardvark Town.",
  );

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  await expect(page.locator(".city-result")).toHaveCount(10);
});
