export interface CitySearchOptions {
  idPrefix: string;
  name: string;
  label: string;
  placeholder: string;
  onSelect: (city: string | null) => void;
  searchCities: (query: string, signal: AbortSignal) => Promise<string[]>;
}

export interface CitySearchComponent {
  element: HTMLDivElement;
  input: HTMLInputElement;
}

export function createCitySearch({
  idPrefix,
  name,
  label: labelText,
  placeholder,
  onSelect,
  searchCities,
}: CitySearchOptions): CitySearchComponent {
  const searchId = `${idPrefix}-search`;
  const suggestionsId = `${idPrefix}-suggestions`;
  const maxSuggestions = 20;
  let activeIndex = -1;
  let latestSearch = 0;
  let activeRequest: AbortController | null = null;

  const element = document.createElement("div");
  element.className = "city-field";

  const label = document.createElement("label");
  label.htmlFor = searchId;
  label.textContent = labelText;

  const input = document.createElement("input");
  input.id = searchId;
  input.name = name;
  input.type = "search";
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", suggestionsId);
  input.setAttribute("aria-expanded", "false");
  input.placeholder = placeholder;
  input.autocomplete = "off";

  const summary = document.createElement("p");
  summary.id = `${idPrefix}-summary`;
  summary.className = "suggestion-summary";

  const suggestions = document.createElement("ul");
  suggestions.id = suggestionsId;
  suggestions.className = "suggestions";
  suggestions.setAttribute("role", "listbox");
  suggestions.hidden = true;

  element.append(label, input, summary, suggestions);

  const hideSuggestions = (): void => {
    suggestions.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    activeIndex = -1;
  };

  const selectCity = (city: string): void => {
    latestSearch += 1;
    activeRequest?.abort();
    activeRequest = null;
    input.value = city;
    onSelect(city);
    summary.textContent = "";
    suggestions.replaceChildren();
    hideSuggestions();
  };

  const setActiveSuggestion = (index: number): void => {
    const options = Array.from(suggestions.children);
    if (options.length === 0) return;

    activeIndex = (index + options.length) % options.length;
    options.forEach((option, optionIndex) => {
      const isActive = optionIndex === activeIndex;
      option.setAttribute("aria-selected", String(isActive));
      if (isActive) {
        input.setAttribute("aria-activedescendant", option.id);
      }
    });

    const activeOption = options[activeIndex];
    if (activeOption) {
      const optionBounds = activeOption.getBoundingClientRect();
      const listBounds = suggestions.getBoundingClientRect();
      if (optionBounds.bottom > listBounds.bottom) {
        suggestions.scrollTop += optionBounds.bottom - listBounds.bottom;
      } else if (optionBounds.top < listBounds.top) {
        suggestions.scrollTop -= listBounds.top - optionBounds.top;
      }
    }
  };

  const renderSuggestions = (matches: string[]): void => {
    suggestions.replaceChildren();
    summary.textContent = "";
    hideSuggestions();

    if (matches.length === 0) {
      summary.textContent = "No se encontraron ciudades.";
      return;
    }

    for (const city of matches.slice(0, maxSuggestions)) {
      const option = document.createElement("li");
      option.id = `${suggestionsId}-option-${suggestions.childElementCount}`;
      option.dataset.city = city;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.textContent = city;
      suggestions.append(option);
    }

    if (matches.length > maxSuggestions) {
      summary.textContent = `Hay ${matches.length.toLocaleString("es")} coincidencias; usa las flechas o desplázate para ver las primeras ${maxSuggestions}.`;
    }
    suggestions.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  input.addEventListener("input", () => {
    onSelect(null);
    const query = input.value.trim();
    latestSearch += 1;
    const searchId = latestSearch;
    activeRequest?.abort();
    activeRequest = null;
    suggestions.replaceChildren();
    summary.textContent = "";
    hideSuggestions();

    if (!query) return;

    const controller = new AbortController();
    activeRequest = controller;
    summary.textContent = "Buscando ciudades...";

    void searchCities(query, controller.signal).then(
      (matches) => {
        if (searchId !== latestSearch) return;
        activeRequest = null;
        renderSuggestions(matches);
      },
      (error: unknown) => {
        if (searchId !== latestSearch) return;
        activeRequest = null;
        summary.textContent =
          "No se pudieron cargar las sugerencias. Inténtalo de nuevo.";
        suggestions.replaceChildren();
        hideSuggestions();
        console.error("Error al buscar ciudades:", error);
      },
    );
  });

  input.addEventListener("keydown", (event) => {
    if (suggestions.hidden) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion(
        activeIndex <= 0
          ? suggestions.childElementCount - 1
          : activeIndex - 1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const city = suggestions.children[activeIndex]?.getAttribute("data-city");
      if (city) selectCity(city);
    } else if (event.key === "Escape") {
      hideSuggestions();
    }
  });

  suggestions.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const option = target.closest<HTMLElement>('[role="option"]');
    const city = option?.dataset.city;
    if (city) selectCity(city);
  });

  return { element, input };
}
