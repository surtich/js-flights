export interface PaginationState {
  currentPage: number;
  totalPages: number;
  disabled?: boolean;
}

export interface PaginationComponent {
  element: HTMLElement;
  update: (state: PaginationState) => void;
}

export function createPagination(
  onPageChange: (page: number) => void,
): PaginationComponent {
  const element = document.createElement("nav");
  element.className = "city-pagination";
  element.setAttribute("aria-label", "Paginación");

  const previousButton = document.createElement("button");
  previousButton.type = "button";
  previousButton.className = "secondary";
  previousButton.textContent = "Anterior";

  const pageIndicator = document.createElement("span");
  pageIndicator.className = "page-indicator";
  pageIndicator.setAttribute("aria-live", "polite");

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "secondary";
  nextButton.textContent = "Siguiente";

  element.append(previousButton, pageIndicator, nextButton);

  let state: PaginationState = { currentPage: 1, totalPages: 1 };
  const update = (newState: PaginationState): void => {
    state = newState;
    pageIndicator.textContent =
      `Página ${state.currentPage} de ${state.totalPages}`;
    previousButton.disabled =
      Boolean(state.disabled) || state.currentPage <= 1;
    nextButton.disabled =
      Boolean(state.disabled) || state.currentPage >= state.totalPages;
  };

  previousButton.addEventListener("click", () => {
    if (!previousButton.disabled) {
      onPageChange(state.currentPage - 1);
    }
  });
  nextButton.addEventListener("click", () => {
    if (!nextButton.disabled) {
      onPageChange(state.currentPage + 1);
    }
  });

  update(state);
  return { element, update };
}
