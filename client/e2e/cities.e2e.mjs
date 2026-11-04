import { expect, test } from "@playwright/test";

test("loads cities once into both selectors and updates their status", async ({ page }) => {
  let citiesRequests = 0;
  page.on("request", (request) => {
    if (request.url() === "http://localhost:3000/cities") citiesRequests += 1;
  });

  await page.goto("/");

  const originCitySelect = page.locator("#origin-city-select");
  const destinationCitySelect = page.locator("#destination-city-select");
  const status = page.locator("#status");

  await expect(originCitySelect).toBeEnabled();
  await expect(destinationCitySelect).toBeEnabled();
  await expect(
    originCitySelect.locator('option[value="Anchor Point"]'),
  ).toHaveCount(1);
  await expect(
    destinationCitySelect.locator('option[value="Anchor Point"]'),
  ).toHaveCount(1);

  const initialStatus = await status.textContent();
  expect(initialStatus).toMatch(/^\d[\d.,\s]* ciudades disponibles$/);
  expect(citiesRequests).toBe(1);

  await originCitySelect.selectOption({ label: "Anchor Point" });
  await expect(status).toHaveText("Origen: Anchor Point");

  await destinationCitySelect.selectOption({ label: "Harvest" });
  await expect(status).toHaveText("Origen: Anchor Point · Destino: Harvest");

  await originCitySelect.selectOption("");
  await expect(status).toHaveText("Destino: Harvest");
  await destinationCitySelect.selectOption("");
  await expect(status).toHaveText(initialStatus);
});

test("shows an error when the cities request fails", async ({ page }) => {
  await page.route("http://localhost:3000/cities", (route) => route.abort());

  await page.goto("/");

  await expect(page.locator("#status")).toHaveText(
    "Comprueba que el servidor esté activo.",
  );
  await expect(page.locator("#origin-city-select")).toBeDisabled();
  await expect(page.locator("#destination-city-select")).toBeDisabled();
  await expect(page.locator("#origin-city-select option")).toHaveText(
    "No se pudieron cargar las ciudades",
  );
  await expect(page.locator("#destination-city-select option")).toHaveText(
    "No se pudieron cargar las ciudades",
  );
});
