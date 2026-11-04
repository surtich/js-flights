# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cities.e2e.mjs >> loads cities and updates the selected city status
- Location: e2e/cities.e2e.mjs:3:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('#status')
Expected: "Ciudad seleccionada: Anchor Poin"
Received: "Ciudad seleccionada: Anchor Point"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" locator('#status') with timeout 5000ms
  - waiting for locator('#status')
    14 × locator resolved to <p id="status" role="status" aria-live="polite">Ciudad seleccionada: Anchor Point</p>
       - unexpected value "Ciudad seleccionada: Anchor Point"

```

```yaml
- status: "Ciudad seleccionada: Anchor Point"
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test("loads cities and updates the selected city status", async ({ page }) => {
  4  |   await page.goto("/");
  5  | 
  6  |   const citySelect = page.locator("#city-select");
  7  |   const status = page.locator("#status");
  8  | 
  9  |   await expect(citySelect).toBeEnabled();
  10 |   await expect(citySelect.locator('option[value="Anchor Point"]')).toHaveCount(
  11 |     1,
  12 |   );
  13 | 
  14 |   const initialStatus = await status.textContent();
  15 |   expect(initialStatus).toMatch(/^\d[\d.,\s]* ciudades disponibles$/);
  16 | 
  17 |   await citySelect.selectOption({ label: "Anchor Point" });
> 18 |   await expect(status).toHaveText("Ciudad seleccionada: Anchor Poin");
     |                        ^ Error: expect(locator).toHaveText(expected) failed
  19 | 
  20 |   await citySelect.selectOption("");
  21 |   await expect(status).toHaveText(initialStatus);
  22 | });
  23 | 
  24 | test("shows an error when the cities request fails", async ({ page }) => {
  25 |   await page.route("http://localhost:3000/cities", (route) => route.abort());
  26 | 
  27 |   await page.goto("/");
  28 | 
  29 |   await expect(page.locator("#status")).toHaveText(
  30 |     "Comprueba que el servidor esté activo.",
  31 |   );
  32 |   await expect(page.locator("#city-select")).toBeDisabled();
  33 |   await expect(page.locator("#city-select option")).toHaveText(
  34 |     "No se pudieron cargar las ciudades",
  35 |   );
  36 | });
  37 | 
```