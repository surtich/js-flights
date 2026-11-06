import { Router, type Request, type Response } from "express";
import { createAccessToken, accessTokenLifetimeSeconds } from "../auth/tokens.ts";
import { verifyPassword } from "../auth/passwords.ts";
import { findUserByName } from "../db/users-repository.ts";

const router = Router();

router.post(
  "/login",
  async (request: Request, response: Response): Promise<void> => {
    const body: unknown = request.body;
    if (!isLoginInput(body)) {
      response.status(400).json({
        error: "Los campos 'name' y 'password' son obligatorios.",
      });
      return;
    }

    try {
      const user = await findUserByName(body.name.trim());
      if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
        response.status(401).json({ error: "Credenciales incorrectas." });
        return;
      }

      response.json({
        accessToken: createAccessToken(user.name),
        tokenType: "Bearer",
        expiresIn: accessTokenLifetimeSeconds,
        user: { name: user.name, role: user.role },
      });
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      response.status(500).json({ error: "No se pudo iniciar sesión." });
    }
  },
);

function isLoginInput(value: unknown): value is { name: string; password: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    "password" in value &&
    typeof value.password === "string" &&
    value.password.length > 0
  );
}

export default router;
