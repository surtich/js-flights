import { expect, test } from "@playwright/test";

test("loads cities and updates the selected city status", async ({ page }) => {
  await page.goto("/");

  const citySelect = page.locator("#city-select");
  const status = page.locator("#status");

  await expect(citySelect).toBeEnabled();
  await expect(citySelect.locator('option[value="Anchor Point"]')).toHaveCount(
    1,
  );

  const initialStatus = await status.textContent();
  expect(initialStatus).toMatch(/^\d[\d.,\s]* ciudades disponibles$/);

  await citySelect.selectOption({ label: "Anchor Point" });
  await expect(status).toHaveText("Ciudad seleccionada: Anchor Point");

  await citySelect.selectOption("");
  await expect(status).toHaveText(initialStatus);
});

test("shows an error when the cities request fails", async ({ page }) => {
  await page.route("http://localhost:3000/cities", (route) => route.abort());

  await page.goto("/");

  await expect(page.locator("#status")).toHaveText(
    "Comprueba que el servidor esté activo.",
  );
  await expect(page.locator("#city-select")).toBeDisabled();
  await expect(page.locator("#city-select option")).toHaveText(
    "No se pudieron cargar las ciudades",
  );
});
