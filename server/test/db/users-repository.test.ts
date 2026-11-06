import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, hashPasswordMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  hashPasswordMock: vi.fn(async (password: string) => `scrypt-hash-${password}`),
}));

vi.mock("../../src/db/database.ts", () => ({
  pool: {
    query: queryMock,
    connect: vi.fn(async () => ({ query: queryMock })),
  },
}));

vi.mock("../../src/auth/passwords.ts", () => ({
  hashPassword: hashPasswordMock,
}));

const { seedDefaultUsers } = await import("../../src/db/users-repository.ts");
const { pool } = await import("../../src/db/database.ts");

describe("seedDefaultUsers", () => {
  beforeEach(() => {
    queryMock.mockReset();
    hashPasswordMock.mockClear();
  });

  it("inserts the initial USER and ADMIN with hashed passwords", async () => {
    const client = await pool.connect();
    await seedDefaultUsers(client);

    expect(hashPasswordMock).toHaveBeenCalledWith("user");
    expect(hashPasswordMock).toHaveBeenCalledWith("admin");
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO users"),
      ["user", "scrypt-hash-user", "USER"],
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO users"),
      ["admin", "scrypt-hash-admin", "ADMIN"],
    );
  });
});
