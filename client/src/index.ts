import { getCities } from "./services.js";

const originCitySelect = document.querySelector<HTMLSelectElement>(
  "#origin-city-select",
);
const destinationCitySelect = document.querySelector<HTMLSelectElement>(
  "#destination-city-select",
);
const status = document.querySelector<HTMLParagraphElement>("#status");

if (!originCitySelect || !destinationCitySelect || !status) {
  throw new Error("No se encontraron los elementos de la lista de ciudades.");
}

try {
  const cities = await getCities();

  const populateSelect = (
    select: HTMLSelectElement,
    placeholder: string,
  ): void => {
    select.replaceChildren(new Option(placeholder, ""));
    for (const city of cities) {
      select.add(new Option(city, city));
    }
    select.disabled = false;
  };

  populateSelect(originCitySelect, "Selecciona una ciudad de origen");
  populateSelect(destinationCitySelect, "Selecciona una ciudad de destino");

  const updateStatus = (): void => {
    const selections = [
      originCitySelect.value && `Origen: ${originCitySelect.value}`,
      destinationCitySelect.value && `Destino: ${destinationCitySelect.value}`,
    ].filter((selection): selection is string => Boolean(selection));

    status.textContent = selections.length
      ? selections.join(" · ")
      : `${cities.length.toLocaleString("es")} ciudades disponibles`;
  };

  originCitySelect.addEventListener("change", updateStatus);
  destinationCitySelect.addEventListener("change", updateStatus);
  updateStatus();
} catch {
  const errorOption = new Option(
    "No se pudieron cargar las ciudades",
    "",
  );
  originCitySelect.replaceChildren(errorOption.cloneNode(true));
  destinationCitySelect.replaceChildren(errorOption);
  status.textContent = "Comprueba que el servidor esté activo.";
}
