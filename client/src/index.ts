import { getCities } from "./services.js";
import { createCitySearch } from "./components/city-search.js";

const originCityContainer = document.querySelector<HTMLDivElement>(
  "#origin-city-field",
);
const destinationCityContainer = document.querySelector<HTMLDivElement>(
  "#destination-city-field",
);
const status = document.querySelector<HTMLParagraphElement>("#status");

if (!originCityContainer || !destinationCityContainer || !status) {
  throw new Error("No se encontraron los elementos de búsqueda de ciudades.");
}

let selectedOrigin: string | null = null;
let selectedDestination: string | null = null;

const updateStatus = (): void => {
  const selections = [
    selectedOrigin && `Origen: ${selectedOrigin}`,
    selectedDestination && `Destino: ${selectedDestination}`,
  ].filter((selection): selection is string => Boolean(selection));

  status.textContent = selections.length
    ? selections.join(" · ")
    : "Busca una ciudad de origen y destino.";
};

const originCitySearch = createCitySearch({
  idPrefix: "origin-city",
  name: "origin",
  label: "Ciudad de origen",
  placeholder: "Busca una ciudad de origen",
  searchCities: getCities,
  onSelect: (city) => {
    selectedOrigin = city;
    updateStatus();
  },
});
const destinationCitySearch = createCitySearch({
  idPrefix: "destination-city",
  name: "destination",
  label: "Ciudad de destino",
  placeholder: "Busca una ciudad de destino",
  searchCities: getCities,
  onSelect: (city) => {
    selectedDestination = city;
    updateStatus();
  },
});

originCityContainer.append(originCitySearch.element);
destinationCityContainer.append(destinationCitySearch.element);
updateStatus();
