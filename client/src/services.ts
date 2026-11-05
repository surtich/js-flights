export async function getCities(
  query: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const search = new URLSearchParams({ search: query });
  const response = await fetch(
    `http://localhost:3000/cities?${search.toString()}`,
    { signal },
  );
  if (!response.ok) throw new Error("No se pudieron cargar las ciudades.");

  const cities: unknown = await response.json();
  if (
    !Array.isArray(cities) ||
    !cities.every((city: unknown) => typeof city === "string")
  ) {
    throw new Error("La respuesta del servidor no contiene una lista de ciudades.");
  }

  return cities;
}