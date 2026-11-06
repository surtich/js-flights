import { createCityAdmin } from "./components/city-admin.ts";
import { createFlightSearchView } from "./components/city-search.ts";

const page = requiredElement<HTMLElement>(
  document,
  "#page-content",
  "No se encontró el contenedor de la página.",
);
const header = requiredElement<HTMLElement>(
  document,
  ".site-header",
  "No se encontró la navegación principal.",
);

const handleRouteLinkClick = (event: MouseEvent): void => {
  console.log("Pulsado", event.target);

  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest<HTMLAnchorElement>("a[data-route]");

  if (link) {
    event.preventDefault();
    if (window.location.hash === link.hash) {
      renderPage();
    } else {
      window.location.hash = link.hash;
    }
  }
};

header.addEventListener("click", handleRouteLinkClick);
page.addEventListener("click", handleRouteLinkClick);

function renderHome(): void {
  const section = document.createElement("section");
  section.className = "welcome";
  section.append(
    createTextElement("p", "eyebrow", "Planifica tu próximo viaje"),
    createTextElement("h1", "", "¿A dónde quieres volar?"),
    createTextElement(
      "p",
      "",
      "Busca vuelos o administra las ciudades disponibles.",
    ),
  );

  const actions = document.createElement("div");
  actions.className = "home-actions";
  actions.append(
    createActionCard(
      "#/flights",
      "✈",
      "Buscar vuelos",
      "Elige origen y destino",
    ),
    createActionCard(
      "#/cities",
      "⌖",
      "Administrar ciudades",
      "Crear, modificar y borrar",
    ),
  );
  section.append(actions);
  page.replaceChildren(section);
}

function renderCityAdmin(): void {
  page.replaceChildren(createCityAdmin());
}

function renderFlightSearch(): void {
  page.replaceChildren(createFlightSearchView());
}

function renderPage(): void {
  const route = window.location.hash.slice(1) || "/";
  if (route === "/cities") {
    renderCityAdmin();
  } else if (route === "/flights") {
    renderFlightSearch();
  } else {
    renderHome();
  }
}

function requiredElement<T extends Element>(
  root: ParentNode,
  selector: string,
  message: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(message);
  return element;
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

function createActionCard(
  route: string,
  icon: string,
  title: string,
  description: string,
): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "action-card";
  link.href = route;
  link.dataset.route = "";

  const iconElement = createTextElement("span", "action-icon", icon);
  iconElement.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.append(
    createTextElement("strong", "", title),
    createTextElement("small", "", description),
  );
  link.append(iconElement, text);
  return link;
}

window.addEventListener("hashchange", renderPage);
renderPage();
