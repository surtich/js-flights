import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/auth/passwords.ts";

describe("password hashing", () => {
  it("uses salted hashes and verifies the original password", async () => {
    const firstHash = await hashPassword("admin");
    const secondHash = await hashPassword("admin");

    expect(firstHash).not.toContain("admin");
    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword("admin", firstHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong", firstHash)).resolves.toBe(false);
  });

  it("rejects malformed hashes", async () => {
    await expect(verifyPassword("admin", "not-a-hash")).resolves.toBe(false);
  });
});
