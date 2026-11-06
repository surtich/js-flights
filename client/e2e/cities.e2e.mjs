import { expect, test } from "@playwright/test";

const cities = [
  "Anchor Point",
  "Harvest",
  ...Array.from({ length: 28 }, (_, index) => `Mad City ${index}`),
];

test.beforeEach(async ({ page }) => {
  await page.route("http://localhost:3000/cities?**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("search") ?? "";
    const matches = cities.filter((city) =>
      city.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    );

    await route.fulfill({
      json: {
        cities: matches.slice(0, 20),
        total: matches.length,
      },
    });
  });
});

test("suggests cities containing the query and updates their status", async ({ page }) => {
  const citiesRequests = [];
  page.on("request", (request) => {
    if (request.url().startsWith("http://localhost:3000/cities?")) {
      citiesRequests.push(request.url());
    }
  });

  await page.goto("/");

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

  await page.goto("/");

  const search = page.locator("#origin-city-search");
  await search.fill("madrid");
  await expect(page.locator("#origin-city-summary")).toHaveText(
    "No se pudieron cargar las sugerencias. Inténtalo de nuevo.",
  );
  await expect(search).toBeEnabled();
});

test("keeps keyboard navigation moving through the scrollable suggestions", async ({ page }) => {
  await page.goto("/");

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
