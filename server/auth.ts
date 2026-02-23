import type { Request, Response, NextFunction } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!NEON_AUTH_BASE_URL) return null;
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${NEON_AUTH_BASE_URL.replace(/\/$/, "")}/.well-known/jwks.json`),
    );
  }
  return jwks;
}

export interface AuthPayload {
  sub: string;
  id?: string;
  email?: string;
  name?: string;
}

export async function verifyNeonToken(
  token: string,
): Promise<AuthPayload | null> {
  const baseUrl = NEON_AUTH_BASE_URL;
  const jwksInstance = getJwks();
  if (!baseUrl || !jwksInstance) return null;

  try {
    const issuer = new URL(baseUrl).origin;
    const { payload } = await jwtVerify(token, jwksInstance, {
      issuer,
      audience: issuer,
    });
    const sub = payload.sub as string;
    if (!sub) return null;
    return {
      sub,
      id: payload.id as string | undefined,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
    };
  } catch {
    return null;
  }
}

export function authMiddleware(required: boolean) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    if (!token) {
      if (required) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      return next();
    }

    const payload = await verifyNeonToken(token);
    if (!payload) {
      if (required) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      return next();
    }

    (req as Request & { authUserId?: string; authPayload?: AuthPayload }).authUserId = payload.sub;
    (req as Request & { authUserId?: string; authPayload?: AuthPayload }).authPayload = payload;
    next();
  };
}
