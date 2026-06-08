import jwt from "jsonwebtoken";
import { JwtPayload } from "@devfolio/shared";

const JWT_SECRET = process.env.JWT_SECRET || "devfolio-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "24h";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
