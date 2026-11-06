import { beforeEach, describe, expect, it } from "vitest";
import {
  createAccessToken,
  verifyAccessToken,
} from "../src/auth/tokens.ts";

describe("access tokens", () => {
  beforeEach(() => {
    process.env.AUTH_TOKEN_SECRET =
      "test-auth-token-secret-at-least-32-bytes-long";
  });

  it("verifies a valid token and rejects a tampered token", () => {
    const token = createAccessToken("admin");

    expect(verifyAccessToken(token)).toBe("admin");
    expect(verifyAccessToken(`${token}tampered`)).toBeNull();
  });

  it("requires a sufficiently long signing secret", () => {
    process.env.AUTH_TOKEN_SECRET = "too-short";

    expect(() => createAccessToken("admin")).toThrow(
      "AUTH_TOKEN_SECRET debe contener al menos 32 bytes.",
    );
  });
});
