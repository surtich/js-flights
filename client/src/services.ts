export async function getCities(): Promise<string[]> {
  const response = await fetch("http://localhost:3000/cities");
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