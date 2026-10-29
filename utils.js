import airports from "./data/airports.json" with { type: "json" };

export const cities = Array.from(
  new Set(Object.values(airports).map((airport) => airport.city)),
)
  .filter((city) => typeof city === "string" && city.trim())
  .sort((left, right) => left.localeCompare(right, "es"));
