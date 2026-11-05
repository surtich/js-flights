import { expect, test } from "@playwright/test";

test("suggests cities containing the query and updates their status", async ({ page }) => {
  let citiesRequests = 0;
  page.on("request", (request) => {
    if (request.url() === "http://localhost:3000/cities") citiesRequests += 1;
  });

  await page.goto("/");

  const originCitySearch = page.locator("#origin-city-search");
  const destinationCitySearch = page.locator("#destination-city-search");
  const status = page.locator("#status");

  await expect(originCitySearch).toBeEnabled();
  await expect(destinationCitySearch).toBeEnabled();
  const initialStatus = await status.textContent();
  expect(initialStatus).toMatch(/^\d[\d.,\s]* ciudades disponibles$/);
  expect(citiesRequests).toBe(1);

  await originCitySearch.fill("point");
  await expect(
    page.locator("#origin-city-suggestions [role=option]").filter({
      hasText: "Anchor Point",
    }),
  ).toHaveCount(1);

  await originCitySearch.fill("nch");
  await expect(
    page.locator("#origin-city-suggestions [role=option]").filter({
      hasText: "Anchor Point",
    }),
  ).toHaveCount(1);
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
  await expect(status).toHaveText(initialStatus);
});

test("shows an error when the cities request fails", async ({ page }) => {
  await page.route("http://localhost:3000/cities", (route) => route.abort());

  await page.goto("/");

  await expect(page.locator("#status")).toHaveText(
    "Comprueba que el servidor esté activo.",
  );
  await expect(page.locator("#origin-city-search")).toBeDisabled();
  await expect(page.locator("#destination-city-search")).toBeDisabled();
  await expect(page.locator("#origin-city-search")).toHaveAttribute(
    "placeholder",
    "No se pudieron cargar las ciudades",
  );
  await expect(page.locator("#destination-city-search")).toHaveAttribute(
    "placeholder",
    "No se pudieron cargar las ciudades",
  );
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
