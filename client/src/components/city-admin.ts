import {
  createCity,
  deleteCity,
  listCities,
  updateCity,
} from "../services.js";
import { createPagination } from "./pagination.js";

export function createCityAdmin(): HTMLElement {
  const section = document.createElement("section");
  section.className = "city-admin page-section";

  const eyebrow = createTextElement("p", "eyebrow", "Administración");
  const heading = createTextElement("h1", "", "Ciudades");
  const intro = createTextElement(
    "p",
    "intro",
    "Crea y administra las ciudades disponibles.",
  );
  const createForm = document.createElement("form");
  createForm.id = "create-city-form";
  const createLabel = document.createElement("label");
  createLabel.htmlFor = "new-city-name";
  createLabel.textContent = "Añadir ciudad";
  const createRow = document.createElement("div");
  createRow.className = "form-row";
  const newNameInput = document.createElement("input");
  newNameInput.id = "new-city-name";
  newNameInput.name = "name";
  newNameInput.type = "text";
  newNameInput.required = true;
  newNameInput.placeholder = "Nombre de la ciudad";
  const createButton = createButtonElement("Crear");
  createButton.type = "submit";
  createRow.append(newNameInput, createButton);
  createForm.append(createLabel, createRow);

  const message = createTextElement(
    "p",
    "city-admin-message",
    "Cargando ciudades...",
  );
  message.id = "city-admin-message";
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");

  const results = document.createElement("ul");
  results.id = "city-results";
  results.className = "city-results";

  const pagination = createPagination((page) => {
    currentPage = page;
    void loadCities();
  });

  section.append(
    eyebrow,
    heading,
    intro,
    createForm,
    message,
    results,
    pagination.element,
  );

  let currentPage = 1;
  let total = 0;
  let pageSize = 20;
  let cities: string[] = [];
  let editingCity: string | null = null;
  let loading = false;

  const setMessage = (text: string, isError = false): void => {
    message.textContent = text;
    message.dataset.error = String(isError);
  };

  const totalPages = (): number => Math.max(1, Math.ceil(total / pageSize));

  const renderPageControls = (): void => {
    pagination.update({
      currentPage,
      totalPages: totalPages(),
      disabled: loading,
    });
  };

  const renderCities = (): void => {
    results.replaceChildren();
    for (const city of cities) {
      const item = document.createElement("li");
      item.className = "city-result";
      if (editingCity === city) {
        item.append(createEditForm(city));
      } else {
        const name = createTextElement("span", "", city);
        const actions = document.createElement("div");
        actions.className = "city-result-actions";
        const editButton = createButtonElement("Modificar", "secondary");
        editButton.type = "button";
        editButton.addEventListener("click", () => {
          editingCity = city;
          renderCities();
          results.querySelector<HTMLInputElement>(".edit-city-form input")?.focus();
        });
        const deleteButton = createButtonElement("Borrar", "danger");
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => {
          void removeCity(city);
        });
        actions.append(editButton, deleteButton);
        item.append(name, actions);
      }
      results.append(item);
    }

    renderPageControls();
  };

  function createEditForm(city: string): HTMLFormElement {
    const form = document.createElement("form");
    form.className = "edit-city-form";
    const input = document.createElement("input");
    input.type = "text";
    input.name = "name";
    input.required = true;
    input.value = city;
    input.setAttribute("aria-label", `Nuevo nombre para ${city}`);
    const saveButton = createButtonElement("Guardar");
    saveButton.type = "submit";
    const cancelButton = createButtonElement("Cancelar", "secondary");
    cancelButton.type = "button";
    cancelButton.addEventListener("click", () => {
      editingCity = null;
      renderCities();
    });
    form.append(input, saveButton, cancelButton);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void renameCity(city, input.value);
    });
    return form;
  }

  async function loadCities(): Promise<boolean> {
    loading = true;
    renderPageControls();
    setMessage("Cargando ciudades...");

    try {
      const result = await listCities(currentPage);
      cities = result.cities;
      total = result.total;
      pageSize = result.pageSize;
      currentPage = result.page;
      editingCity = null;
      renderCities();
      setMessage(
        total === 0
          ? "Todavía no hay ciudades."
          : `Se muestran ${cities.length} de ${total} ciudades.`,
      );
      return true;
    } catch (error) {
      console.error("Error al listar ciudades:", error);
      setMessage(getErrorMessage(error, "No se pudieron cargar las ciudades."), true);
      return false;
    } finally {
      loading = false;
      renderPageControls();
    }
  }

  async function renameCity(currentName: string, newName: string): Promise<void> {
    if (!newName.trim()) {
      setMessage("El nombre de la ciudad no puede estar vacío.", true);
      return;
    }

    try {
      const updatedCity = await updateCity(currentName, newName.trim());
      editingCity = null;
      if (await loadCities()) {
        setMessage(`Se actualizó la ciudad a ${updatedCity.name}.`);
      }
    } catch (error) {
      console.error("Error al actualizar ciudad:", error);
      setMessage(getErrorMessage(error, "No se pudo actualizar la ciudad."), true);
    }
  }

  async function removeCity(city: string): Promise<void> {
    try {
      await deleteCity(city);
      total = Math.max(0, total - 1);
      if (cities.length === 1 && currentPage > 1) {
        currentPage -= 1;
      }
      if (await loadCities()) {
        setMessage(`Se eliminó la ciudad ${city}.`);
      }
    } catch (error) {
      console.error("Error al eliminar ciudad:", error);
      setMessage(getErrorMessage(error, "No se pudo eliminar la ciudad."), true);
    }
  }

  createForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = newNameInput.value.trim();
    if (!name) {
      setMessage("El nombre de la ciudad no puede estar vacío.", true);
      return;
    }

    createButton.disabled = true;
    void createCity(name).then(
      async (city) => {
        newNameInput.value = "";
        currentPage = 1;
        if (await loadCities()) {
          setMessage(`Se creó la ciudad ${city.name}.`);
        }
      },
      (error: unknown) => {
        console.error("Error al crear ciudad:", error);
        setMessage(getErrorMessage(error, "No se pudo crear la ciudad."), true);
      },
    ).finally(() => {
      createButton.disabled = false;
    });
  });

  void loadCities();
  return section;
}

function createTextElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string,
  text: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createButtonElement(
  text: string,
  className = "",
): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = text;
  if (className) button.className = className;
  return button;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
