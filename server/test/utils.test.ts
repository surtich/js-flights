import { describe, expect, it } from "vitest";
import { cities, searchCities } from "../src/utils.ts";

describe("cities", () => {
  it("contains only non-empty city names", () => {
    expect(cities.length).toBeGreaterThan(0);
    expect(cities.every((city) => city.trim().length > 0)).toBe(true);
  });

  it("contains each city only once", () => {
    expect(new Set(cities).size).toBe(cities.length);
  });

  it("is sorted alphabetically using Spanish collation", () => {
    expect(cities).toEqual([...cities].sort((left, right) => left.localeCompare(right, "es")));
  });

  it("includes known cities from the airport data", () => {
    expect(cities).toContain("Anchor Point");
    expect(cities).toContain("Harvest");
  });

  it("finds partial matches without case sensitivity", () => {
    expect(searchCities("nch")).toContain("Anchor Point");
    expect(searchCities("NCH")).toContain("Anchor Point");
    expect(searchCities("nch").every((city) => city.toLowerCase().includes("nch")))
      .toBe(true);
  });

  it("trims the search and returns no matches for a blank query", () => {
    expect(searchCities("  Anchor Point  ")).toContain("Anchor Point");
    expect(searchCities("   ")).toEqual([]);
    expect(searchCities("not-a-real-city")).toEqual([]);
  });
});
