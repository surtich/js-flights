export interface CitySearchResults {
  cities: string[];
  total: number;
}

export interface City {
  name: string;
}

export interface CityListResults {
  cities: string[];
  total: number;
  page: number;
  pageSize: number;
}

const citiesApi = "http://localhost:3000/cities";

export async function searchCities(
  query: string,
  signal?: AbortSignal,
): Promise<CitySearchResults> {
  const search = new URLSearchParams({ search: query });
  const response = await fetch(
    `${citiesApi}?${search.toString()}`,
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

export async function createCity(name: string): Promise<City> {
  return requestCity(citiesApi, "POST", name, "No se pudo crear la ciudad.");
}

export async function listCities(page: number): Promise<CityListResults> {
  const search = new URLSearchParams({ page: String(page) });
  const response = await fetch(`${citiesApi}?${search.toString()}`);
  if (!response.ok) {
    throw new Error("No se pudieron cargar las ciudades.");
  }

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
    result.total < result.cities.length ||
    !("page" in result) ||
    result.page !== page ||
    !("pageSize" in result) ||
    typeof result.pageSize !== "number" ||
    !Number.isSafeInteger(result.pageSize) ||
    result.pageSize < 1 ||
    result.cities.length > result.pageSize
  ) {
    throw new Error("La respuesta del servidor no contiene una página válida.");
  }

  return {
    cities: result.cities,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
}

export async function updateCity(
  currentName: string,
  name: string,
): Promise<City> {
  return requestCity(
    `${citiesApi}/${encodeURIComponent(currentName)}`,
    "PUT",
    name,
    "No se pudo actualizar la ciudad.",
  );
}

export async function deleteCity(name: string): Promise<void> {
  const response = await fetch(`${citiesApi}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(cityRequestError(response.status, "No se pudo eliminar la ciudad."));
  }
}

async function requestCity(
  url: string,
  method: "POST" | "PUT",
  name: string,
  fallbackMessage: string,
): Promise<City> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(cityRequestError(response.status, fallbackMessage));
  }

  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    !("name" in result) ||
    typeof result.name !== "string"
  ) {
    throw new Error("La respuesta del servidor no contiene una ciudad válida.");
  }

  return { name: result.name };
}

function cityRequestError(status: number, fallbackMessage: string): string {
  if (status === 404) return "No se encontró la ciudad.";
  if (status === 409) return "Ya existe una ciudad con ese nombre.";
  if (status === 400) return "El nombre de la ciudad no es válido.";
  return fallbackMessage;
}