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
      <select id="city-select" disabled></select>
      <p id="status"></p>
    `;
    getCitiesMock.mockReset();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it("displays loaded cities and updates the selection status", async () => {
    getCitiesMock.mockResolvedValue(["Madrid", "Barcelona"]);

    await import("../src/index.ts");

    const citySelect = document.querySelector<HTMLSelectElement>("#city-select");
    const status = document.querySelector<HTMLParagraphElement>("#status");

    expect(citySelect?.disabled).toBe(false);
    expect(Array.from(citySelect?.options ?? []).map((option) => option.text))
      .toEqual(["Selecciona una ciudad", "Madrid", "Barcelona"]);
    expect(status?.textContent).toBe("2 ciudades disponibles");

    citySelect!.value = "Madrid";
    citySelect!.dispatchEvent(new Event("change"));
    expect(status?.textContent).toBe("Ciudad seleccionada: Madrid");

    citySelect!.value = "";
    citySelect!.dispatchEvent(new Event("change"));
    expect(status?.textContent).toBe("2 ciudades disponibles");
  });

  it("displays an error state when loading cities fails", async () => {
    getCitiesMock.mockRejectedValue(new Error("network error"));

    await import("../src/index.ts");

    const citySelect = document.querySelector<HTMLSelectElement>("#city-select");
    const status = document.querySelector<HTMLParagraphElement>("#status");

    expect(citySelect?.disabled).toBe(true);
    expect(citySelect?.options[0]?.text).toBe(
      "No se pudieron cargar las ciudades",
    );
    expect(status?.textContent).toBe("Comprueba que el servidor esté activo.");
  });
});
