import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../config/jwt";
import { AppError } from "./error-handler";
import type { JwtPayload } from "@devfolio/shared";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
}
