import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, keyLength);
  if (!(derivedKey instanceof Buffer)) {
    throw new Error("No se pudo derivar la clave de la contraseña.");
  }

  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [algorithm, encodedSalt, encodedKey, extra] = passwordHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !encodedSalt ||
    !encodedKey ||
    extra !== undefined
  ) {
    return false;
  }

  let salt: Buffer;
  let expectedKey: Buffer;
  try {
    salt = Buffer.from(encodedSalt, "base64url");
    expectedKey = Buffer.from(encodedKey, "base64url");
  } catch {
    return false;
  }
  if (salt.length !== 16 || expectedKey.length !== keyLength) return false;

  const derivedKey = await scrypt(password, salt, keyLength);
  if (!(derivedKey instanceof Buffer)) {
    throw new Error("No se pudo derivar la clave de la contraseña.");
  }
  return timingSafeEqual(derivedKey, expectedKey);
}
