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
      <select id="origin-city-select" disabled></select>
      <select id="destination-city-select" disabled></select>
      <p id="status"></p>
    `;
    getCitiesMock.mockReset();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it("loads cities once into both selectors and updates selection status", async () => {
    getCitiesMock.mockResolvedValue(["Madrid", "Barcelona"]);

    await import("../src/index.ts");

    const originCitySelect = document.querySelector<HTMLSelectElement>(
      "#origin-city-select",
    );
    const destinationCitySelect = document.querySelector<HTMLSelectElement>(
      "#destination-city-select",
    );
    const status = document.querySelector<HTMLParagraphElement>("#status");

    expect(getCitiesMock).toHaveBeenCalledTimes(1);
    expect(originCitySelect?.disabled).toBe(false);
    expect(destinationCitySelect?.disabled).toBe(false);
    expect(Array.from(originCitySelect?.options ?? []).map((option) => option.text))
      .toEqual(["Selecciona una ciudad de origen", "Madrid", "Barcelona"]);
    expect(
      Array.from(destinationCitySelect?.options ?? []).map(
        (option) => option.text,
      ),
    ).toEqual(["Selecciona una ciudad de destino", "Madrid", "Barcelona"]);
    expect(status?.textContent).toBe("2 ciudades disponibles");

    originCitySelect!.value = "Madrid";
    originCitySelect!.dispatchEvent(new Event("change"));
    expect(status?.textContent).toBe("Origen: Madrid");

    destinationCitySelect!.value = "Barcelona";
    destinationCitySelect!.dispatchEvent(new Event("change"));
    expect(status?.textContent).toBe("Origen: Madrid · Destino: Barcelona");

    originCitySelect!.value = "";
    originCitySelect!.dispatchEvent(new Event("change"));
    expect(status?.textContent).toBe("Destino: Barcelona");
  });

  it("displays an error state when loading cities fails", async () => {
    getCitiesMock.mockRejectedValue(new Error("network error"));

    await import("../src/index.ts");

    const originCitySelect = document.querySelector<HTMLSelectElement>(
      "#origin-city-select",
    );
    const destinationCitySelect = document.querySelector<HTMLSelectElement>(
      "#destination-city-select",
    );
    const status = document.querySelector<HTMLParagraphElement>("#status");

    expect(originCitySelect?.disabled).toBe(true);
    expect(destinationCitySelect?.disabled).toBe(true);
    expect(originCitySelect?.options[0]?.text).toBe(
      "No se pudieron cargar las ciudades",
    );
    expect(destinationCitySelect?.options[0]?.text).toBe(
      "No se pudieron cargar las ciudades",
    );
    expect(status?.textContent).toBe("Comprueba que el servidor esté activo.");
  });
});
