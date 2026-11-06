import { createHmac, timingSafeEqual } from "node:crypto";

export const accessTokenLifetimeSeconds = 60 * 60;

interface AccessTokenPayload {
  sub: string;
  exp: number;
}

function getTokenSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("AUTH_TOKEN_SECRET debe contener al menos 32 bytes.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getTokenSecret())
    .update(payload)
    .digest("base64url");
}

export function createAccessToken(name: string): string {
  const payload: AccessTokenPayload = {
    sub: name,
    exp: Math.floor(Date.now() / 1000) + accessTokenLifetimeSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAccessToken(token: string): string | null {
  const [encodedPayload, providedSignature, extra] = token.split(".");
  if (!encodedPayload || !providedSignature || extra !== undefined) return null;

  const expectedSignature = Buffer.from(sign(encodedPayload), "base64url");
  const actualSignature = Buffer.from(providedSignature, "base64url");
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("sub" in payload) ||
      typeof payload.sub !== "string" ||
      !payload.sub ||
      !("exp" in payload) ||
      typeof payload.exp !== "number" ||
      !Number.isSafeInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload.sub;
  } catch {
    return null;
  }
}
