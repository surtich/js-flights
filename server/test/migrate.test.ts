import { describe, expect, it, vi } from "vitest";

const { queryMock, endMock } = vi.hoisted(() => ({
  queryMock: vi.fn().mockResolvedValue(undefined),
  endMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/db/database.ts", () => ({
  pool: {
    query: queryMock,
    end: endMock,
  },
}));

describe("database migration", () => {
  it("creates the tables inside a transaction without deleting existing data", async () => {
    queryMock.mockClear();
    endMock.mockClear();
    await import("../src/db/migrate.ts");

    const statements = queryMock.mock.calls.map(([statement]) =>
      String(statement),
    );

    expect(statements[0]).toBe("BEGIN");
    expect(statements[1]).toContain("CREATE TABLE IF NOT EXISTS cities");
    expect(statements[1]).toContain("CREATE TABLE IF NOT EXISTS users");
    expect(statements).toEqual(["BEGIN", statements[1], "COMMIT"]);
    expect(endMock).toHaveBeenCalledOnce();
  });
});
