import { describe, expect, it } from "vitest";
import { cities } from "../src/db/seed-data.ts";

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

});
