import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("../src/database.ts", () => ({
  pool: { query: queryMock },
}));

const { searchCities } = await import("../src/cities-repository.ts");

describe("searchCities repository", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("runs a case-insensitive substring query and returns its total count", async () => {
    queryMock.mockResolvedValue({
      rows: [{ name: "Madrid", total: "23" }],
    });

    await expect(searchCities(" Mad ")).resolves.toEqual({
      cities: ["Madrid"],
      total: 23,
    });

    const [sql, parameters] = queryMock.mock.calls[0]!;
    expect(sql).toContain("strpos(lower(name), lower($1)) > 0");
    expect(sql).toContain("LIMIT $2");
    expect(parameters).toEqual(["Mad", 20]);
  });

  it("returns zero matches when the database returns no rows", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    await expect(searchCities("not-found")).resolves.toEqual({
      cities: [],
      total: 0,
    });
  });

  it("propagates database failures", async () => {
    queryMock.mockRejectedValue(new Error("database unavailable"));

    await expect(searchCities("mad")).rejects.toThrow("database unavailable");
  });
});
