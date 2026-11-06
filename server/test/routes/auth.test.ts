import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { hashPassword } from "../../src/auth/passwords.ts";
import { verifyAccessToken } from "../../src/auth/tokens.ts";
import authRouter from "../../src/routes/auth.ts";

const { findUserByNameMock } = vi.hoisted(() => ({
  findUserByNameMock: vi.fn(),
}));

vi.mock("../../src/db/users-repository.ts", () => ({
  findUserByName: findUserByNameMock,
}));

process.env.AUTH_TOKEN_SECRET = "dedicated-auth-test-secret-at-least-32-bytes";

const app = express();
app.use(express.json());
app.use("/auth", authRouter);

describe("POST /auth/login", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    findUserByNameMock.mockReset();
  });

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("returns a bearer token and role for valid credentials", async () => {
    findUserByNameMock.mockResolvedValue({
      name: "admin",
      passwordHash: await hashPassword("admin"),
      role: "ADMIN",
    });

    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: " admin ", password: "admin" }),
    });

    expect(response.status).toBe(200);
    const result: unknown = await response.json();
    expect(result).toMatchObject({
      tokenType: "Bearer",
      expiresIn: 3600,
      user: { name: "admin", role: "ADMIN" },
    });
    expect(result).toHaveProperty("accessToken");
    if (
      typeof result !== "object" ||
      result === null ||
      !("accessToken" in result) ||
      typeof result.accessToken !== "string"
    ) {
      throw new Error("La respuesta no contiene el token de acceso.");
    }

    expect(verifyAccessToken(result.accessToken)).toBe("admin");
    expect(findUserByNameMock).toHaveBeenCalledWith("admin");
  });

  it("rejects incorrect and unknown-user credentials", async () => {
    findUserByNameMock.mockResolvedValue({
      name: "admin",
      passwordHash: await hashPassword("correct-password"),
      role: "ADMIN",
    });

    const incorrectPasswordResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "admin", password: "wrong-password" }),
    });
    expect(incorrectPasswordResponse.status).toBe(401);

    findUserByNameMock.mockResolvedValue(null);
    const unknownUserResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "missing", password: "wrong-password" }),
    });
    expect(unknownUserResponse.status).toBe(401);
    await expect(unknownUserResponse.json()).resolves.toEqual({
      error: "Credenciales incorrectas.",
    });
  });

  it.each([
    {},
    { name: "admin" },
    { name: "", password: "admin" },
    { name: "admin", password: "" },
  ])("rejects malformed login input", async (body) => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(400);
    expect(findUserByNameMock).not.toHaveBeenCalled();
  });
});
