import { describe, expect, it, vi } from "vitest";

const { queryMock, endMock } = vi.hoisted(() => ({
  queryMock: vi.fn().mockResolvedValue(undefined),
  endMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/database.ts", () => ({
  pool: {
    query: queryMock,
    end: endMock,
  },
}));

describe("database migration", () => {
  it("creates the table and truncates it inside a transaction", async () => {
    queryMock.mockClear();
    endMock.mockClear();
    await import("../src/migrate.ts");

    const statements = queryMock.mock.calls.map(([statement]) =>
      String(statement),
    );

    expect(statements[0]).toBe("BEGIN");
    expect(statements[1]).toContain("CREATE TABLE IF NOT EXISTS cities");
    expect(statements[2]).toBe("TRUNCATE TABLE cities");
    expect(statements[3]).toBe("COMMIT");
    expect(endMock).toHaveBeenCalledOnce();
  });
});
