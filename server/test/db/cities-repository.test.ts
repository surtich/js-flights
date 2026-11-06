import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("../../src/db/database.ts", () => ({
  pool: { query: queryMock },
}));

const {
  searchCities,
  listCities,
  createCity,
  findCity,
  renameCity,
  deleteCity,
} = await import("../../src/db/cities-repository.ts");

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

  it("lists cities in pages and returns the total count", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: "25" }] })
      .mockResolvedValueOnce({ rows: [{ name: "Madrid" }] });

    await expect(listCities(2)).resolves.toEqual({
      cities: ["Madrid"],
      total: 25,
      page: 2,
      pageSize: 20,
    });
    expect(queryMock.mock.calls[0]![0]).toContain("COUNT(*)");
    expect(queryMock.mock.calls[1]![0]).toContain("ORDER BY name");
    expect(queryMock.mock.calls[1]![1]).toEqual([20, 20]);
  });

  it("inserts a city and returns its name", async () => {
    queryMock.mockResolvedValue({ rows: [{ name: "Madrid" }] });

    await expect(createCity("Madrid")).resolves.toBe("Madrid");
    const [sql, parameters] = queryMock.mock.calls[0]!;
    expect(sql).toContain("ON CONFLICT (name) DO NOTHING");
    expect(parameters).toEqual(["Madrid"]);
  });

  it("returns null when the city already exists", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    await expect(createCity("Madrid")).resolves.toBeNull();
  });

  it("finds a city by exact name", async () => {
    queryMock.mockResolvedValue({ rows: [{ name: "Madrid" }] });

    await expect(findCity("Madrid")).resolves.toBe("Madrid");
    expect(queryMock.mock.calls[0]![1]).toEqual(["Madrid"]);
  });

  it("renames a city and returns null when it does not exist", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ name: "Barcelona" }] });

    await expect(renameCity("Madrid", "Barcelona")).resolves.toBe("Barcelona");
    expect(queryMock.mock.calls[0]![1]).toEqual(["Madrid", "Barcelona"]);

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(renameCity("Missing", "Barcelona")).resolves.toBeNull();
  });

  it("deletes a city and reports whether it existed", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ name: "Madrid" }] });
    await expect(deleteCity("Madrid")).resolves.toBe(true);

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(deleteCity("Missing")).resolves.toBe(false);
  });
});
