// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createPagination } from "../src/components/pagination.js";

describe("createPagination", () => {
  it("reports the current page and disables controls at the boundaries", () => {
    const onPageChange = vi.fn();
    const pagination = createPagination(onPageChange);
    document.body.append(pagination.element);

    const [previousButton, nextButton] =
      pagination.element.querySelectorAll("button");
    expect(pagination.element.querySelector(".page-indicator")?.textContent).toBe(
      "Página 1 de 1",
    );
    expect(previousButton?.disabled).toBe(true);
    expect(nextButton?.disabled).toBe(true);

    pagination.update({ currentPage: 2, totalPages: 3 });
    expect(pagination.element.querySelector(".page-indicator")?.textContent).toBe(
      "Página 2 de 3",
    );
    expect(previousButton?.disabled).toBe(false);
    expect(nextButton?.disabled).toBe(false);
  });

  it("requests only valid previous and next pages", () => {
    const onPageChange = vi.fn();
    const pagination = createPagination(onPageChange);
    pagination.update({ currentPage: 2, totalPages: 3 });

    const [previousButton, nextButton] =
      pagination.element.querySelectorAll("button");
    previousButton?.click();
    nextButton?.click();
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);

    pagination.update({ currentPage: 2, totalPages: 3, disabled: true });
    previousButton?.click();
    nextButton?.click();
    expect(onPageChange).toHaveBeenCalledTimes(2);
  });
});
