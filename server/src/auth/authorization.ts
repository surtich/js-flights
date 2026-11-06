import type { RequestHandler } from "express";
import { verifyAccessToken } from "./tokens.ts";
import { findUserByName } from "../db/users-repository.ts";

export const requireAdmin: RequestHandler = async (
  request,
  response,
  next,
): Promise<void> => {
  const authorization = request.get("Authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/);
  if (!match?.[1]) {
    response.status(401).json({ error: "Se requiere autenticación." });
    return;
  }

  try {
    const name = verifyAccessToken(match[1]);
    if (!name) {
      response.status(401).json({ error: "El token no es válido o ha expirado." });
      return;
    }

    const user = await findUserByName(name);
    if (!user) {
      response.status(401).json({ error: "El usuario ya no existe." });
      return;
    }
    if (user.role !== "ADMIN") {
      response.status(403).json({ error: "Se requiere el rol ADMIN." });
      return;
    }

    next();
  } catch (error) {
    console.error("Error al validar los permisos de administrador:", error);
    response.status(500).json({ error: "No se pudieron validar los permisos." });
  }
};
