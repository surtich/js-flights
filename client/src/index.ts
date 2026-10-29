import { getCities } from "./services.js";

const citySelect = document.querySelector<HTMLSelectElement>("#city-select");
const status = document.querySelector<HTMLParagraphElement>("#status");

if (!citySelect || !status) {
  throw new Error("No se encontraron los elementos de la lista de ciudades.");
}

try {
  const cities = await getCities();

  citySelect.replaceChildren(new Option("Selecciona una ciudad", ""));
  for (const city of cities) {
    citySelect.add(new Option(city, city));
  }
  citySelect.disabled = false;
  status.textContent = `${cities.length.toLocaleString("es")} ciudades disponibles`;
  citySelect.addEventListener("change", () => {
    status.textContent = citySelect.value
      ? `Ciudad seleccionada: ${citySelect.value}`
      : `${cities.length.toLocaleString("es")} ciudades disponibles`;
  });
} catch {
  citySelect.replaceChildren(
    new Option("No se pudieron cargar las ciudades", ""),
  );
  status.textContent = "Comprueba que el servidor esté activo.";
}
