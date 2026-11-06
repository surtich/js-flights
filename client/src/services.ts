export interface CitySearchResults {
  cities: string[];
  total: number;
}

export async function searchCities(
  query: string,
  signal?: AbortSignal,
): Promise<CitySearchResults> {
  const search = new URLSearchParams({ search: query });
  const response = await fetch(
    `http://localhost:3000/cities?${search.toString()}`,
    { signal },
  );
  if (!response.ok) throw new Error("No se pudieron cargar las ciudades.");

  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    !("cities" in result) ||
    !Array.isArray(result.cities) ||
    !result.cities.every((city: unknown) => typeof city === "string") ||
    !("total" in result) ||
    typeof result.total !== "number" ||
    !Number.isSafeInteger(result.total) ||
    result.total < result.cities.length
  ) {
    throw new Error("La respuesta del servidor no contiene resultados válidos.");
  }

  return {
    cities: result.cities,
    total: result.total,
  };
}