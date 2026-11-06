import airports from "../../data/airports.json" with { type: "json" };

type Airport = {
  city?: string | null;
};

const airportRecords = airports as Record<string, Airport>;

export const cities: string[] = Array.from(
  new Set(
    Object.values(airportRecords)
      .map((airport) => airport.city)
      .filter(
        (city): city is string =>
          typeof city === "string" && city.trim().length > 0,
      ),
  ),
).sort((left, right) => left.localeCompare(right, "es"));
